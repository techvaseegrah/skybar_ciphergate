const asyncHandler = require('express-async-handler');
const Worker = require('../models/Worker');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// @desc    Create new worker
// @route   POST /api/workers
// @access  Private/Admin
const createWorker = asyncHandler(async (req, res) => {
  try {
    const name = req.body.name ? req.body.name.trim() : '';
    const username = req.body.username ? req.body.username.trim() : '';
    const rfid = req.body.rfid ? req.body.rfid.trim() : '';
    const salary = req.body.salary ? Number(req.body.salary.trim()) : '';
    const finalSalary = req.body.salary ? Number(req.body.salary.trim()) : '';
    const password = req.body.password ? req.body.password.trim() : '';
    const subdomain = req.body.subdomain ? req.body.subdomain.trim() : '';
    const department = req.body.department ? req.body.department.trim() : '';
    const photo = req.body.photo ? req.body.photo.trim() : '';
    const faceEmbeddings = req.body.faceEmbeddings ? req.body.faceEmbeddings : [];
    let perDaySalary = 0;

    if (salary <= 0) {
      res.status(400);
      throw new Error('Minimum salary is required and cannot be empty');
    }

    perDaySalary = salary / 30;

    if (!name || name.length === 0) {
      res.status(400);
      throw new Error('Name is required and cannot be empty');
    }

    if (!username) {
      res.status(400);
      throw new Error('Username is required and cannot be empty');
    }

    if (!subdomain) {
      res.status(400);
      throw new Error('Company name is required, login again.');
    }

    if (!password) {
      res.status(400);
      throw new Error('Password is required and cannot be empty');
    }

    if (!department) {
      res.status(400);
      throw new Error('Department is required');
    }

    const workerExists = await Worker.findOne({ username });
    if (workerExists) {
      res.status(400);
      throw new Error('Worker with this username already exists');
    }

    const departmentDoc = await Department.findById(department);
    if (!departmentDoc) {
      res.status(400);
      throw new Error('Invalid department');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const worker = await Worker.create({
      name,
      username,
      rfid,
      salary,
      finalSalary,
      perDaySalary,
      subdomain,
      password: hashedPassword,
      department: departmentDoc._id,
      photo: photo || '',
      faceEmbeddings: faceEmbeddings || [],
      totalPoints: 0
    });

    res.status(201).json({
      _id: worker._id,
      name: worker.name,
      username: worker.username,
      salary: worker.salary,
      finalSalary: worker.finalSalary,
      perDaySalary: worker.perDaySalary,
      rfid: worker.rfid,
      subdomain: worker.subdomain,
      department: departmentDoc.name,
      photo: worker.photo,
      faceEmbeddings: worker.faceEmbeddings
    });

  } catch (error) {
    console.error('Worker Creation Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to create worker');
  }
});

const generateUniqueRFID = async () => {
  const generateRFID = () => {
    const letters = String.fromCharCode(
      65 + Math.floor(Math.random() * 26),
      65 + Math.floor(Math.random() * 26)
    );
    const numbers = Math.floor(1000 + Math.random() * 9000).toString();
    return `${letters}${numbers}`;
  };

  let rfid;
  let isUnique = false;

  while (!isUnique) {
    rfid = await generateRFID();
    const existingWorker = await Worker.findOne({ rfid });
    if (!existingWorker) {
      isUnique = true;
    }
  }

  return rfid;
};

const generateId = asyncHandler(async (req, res) => {
  const rfid = await generateUniqueRFID();

  res.status(200).json({
    rfid: rfid,
    message: "ID was generated"
  });
});

const getWorkers = asyncHandler(async (req, res) => {
    try {
        const workers = await Worker.find({ subdomain: req.body.subdomain })
            .select('-password')
            .populate('department', 'name');

        const transformedWorkers = workers.map(worker => ({
            ...worker.toObject(),
            department: worker.department ? worker.department.name : 'N/A',
            photoUrl: worker.photo
                ? `/uploads/${worker.photo}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}`
        }));

        res.json(transformedWorkers);
    } catch (error) {
        console.error('Get Workers Error:', error);
        res.status(500);
        throw new Error('Failed to retrieve workers');
    }
});
const getPublicWorkers = asyncHandler(async (req, res) => {
  try {
    const workers = await Worker.find({ subdomain: req.body.subdomain })
      .select('name username subdomain department photo')
      .populate('department', 'name');

    const transformedWorkers = workers.map(worker => ({
      _id: worker._id,
      name: worker.name,
      username: worker.username,
      subdomain: worker.subdomain,
      department: worker.department ? worker.department.name : 'Unassigned',
      photo: worker.photo
    }));

    res.json(transformedWorkers);
  } catch (error) {
    console.error('Get Public Workers Error:', error);
    res.status(500);
    throw new Error('Failed to retrieve workers');
  }
});

const getWorkerById = asyncHandler(async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .select('-password')
      .populate('department', 'name');

    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }

    res.json(worker);
  } catch (error) {
    console.error('Get Worker by ID Error:', error);
    res.status(404);
    throw new Error(error.message || 'Worker not found');
  }
});

const updateWorker = asyncHandler(async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }

    const { name, username, salary, department, password, photo, faceEmbeddings } = req.body;
    const updateData = {};

    if (department) {
      const departmentExists = await Department.findById(department);
      if (!departmentExists) {
        res.status(400);
        throw new Error('Invalid department');
      }
      updateData.department = department;
    }

    if (name) updateData.name = name;

    if (username) {
      const usernameExists = await Worker.findOne({
        username,
        _id: { $ne: req.params.id }
      });
      if (usernameExists) {
        res.status(400);
        throw new Error('Username already exists');
      }
      updateData.username = username;
    }

    if (photo) {
      updateData.photo = photo;
    }

    if (faceEmbeddings) {
      updateData.faceEmbeddings = faceEmbeddings;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (salary) {
      const numericSalary = Number(salary);
      if (isNaN(numericSalary) || numericSalary <= 0) {
        res.status(400);
        throw new Error('Invalid salary value');
      }

      updateData.salary = numericSalary;
      updateData.finalSalary = numericSalary;
      updateData.perDaySalary = numericSalary / 30;
    }

    const updatedWorker = await Worker.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name');

    res.json({
      _id: updatedWorker._id,
      name: updatedWorker.name,
      username: updatedWorker.username,
      salary: updatedWorker.salary,
      perDaySalary: updatedWorker.perDaySalary,
      finalSalary: updatedWorker.finalSalary,
      department: updatedWorker.department.name,
      photo: updatedWorker.photo,
      faceEmbeddings: updatedWorker.faceEmbeddings
    });
  } catch (error) {
    console.error('Update Worker Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to update worker');
  }
});

const deleteWorker = asyncHandler(async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }

    if (worker.photo) {
      const photoPath = path.join(__dirname, '../uploads', worker.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await worker.deleteOne();
    res.json({ message: 'Worker removed successfully' });
  } catch (error) {
    console.error('Delete Worker Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to delete worker');
  }
});

const getWorkerActivities = asyncHandler(async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error('Get Worker Activities Error:', error);
    res.status(500);
    throw new Error('Failed to retrieve worker activities');
  }
});

const resetWorkerActivities = asyncHandler(async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }

    worker.totalPoints = 0;
    worker.topicPoints = {};
    worker.lastSubmission = {};
    await worker.save();

    res.json({ message: 'Worker activities reset successfully' });
  } catch (error) {
    console.error('Reset Worker Activities Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to reset worker activities');
  }
});

const getWorkersByDepartment = asyncHandler(async (req, res) => {
  try {
    const workers = await Worker.find({ department: req.params.departmentId })
      .select('-password')
      .populate('department', 'name');

    res.json(workers);
  } catch (error) {
    console.error('Get Workers by Department Error:', error);
    res.status(500);
    throw new Error('Failed to retrieve workers by department');
  }
});

// @desc    Get worker by RFID
// @route   POST /api/worker/get-worker-by-rfid
// @access  Private
const getWorkerByRfid = asyncHandler(async (req, res) => {
  try {
    const { rfid } = req.body;

    if (!rfid) {
      res.status(400);
      throw new Error('RFID is required');
    }

    const worker = await Worker.findOne({ rfid })
      .select('-password')
      .populate('department', 'name');

    if (!worker) {
      res.status(404);
      throw new Error('Worker not found');
    }

    res.json({
      worker: {
        _id: worker._id,
        name: worker.name,
        username: worker.username,
        rfid: worker.rfid,
        subdomain: worker.subdomain,
        department: worker.department ? worker.department.name : 'N/A',
        photo: worker.photo
      }
    });
  } catch (error) {
    console.error('Get Worker by RFID Error:', error);
    res.status(400);
    throw new Error(error.message || 'Failed to retrieve worker');
  }
});

module.exports = {
  getWorkers,
  createWorker,
  getWorkerById,
  updateWorker,
  deleteWorker,
  getWorkerActivities,
  resetWorkerActivities,
  getWorkersByDepartment,
  getPublicWorkers,
  generateId,
  getWorkerByRfid
};