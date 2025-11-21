const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Advance = require('../models/Advance');
const Worker = require('../models/Worker');
const Admin = require('../models/Admin');

describe('Advance API', () => {
  let adminToken;
  let workerId;
  let adminId;
  let subdomain = 'testcompany';

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    // Clean up test data
    await Advance.deleteMany({ subdomain });
    await Worker.deleteMany({ subdomain });
    await Admin.deleteMany({ subdomain });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test admin
    const admin = new Admin({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      subdomain,
      role: 'admin'
    });
    await admin.save();
    adminId = admin._id;

    // Create test worker
    const worker = new Worker({
      name: 'Test Worker',
      username: 'testworker',
      rfid: 'RFID123',
      subdomain,
      password: 'password123',
      department: mongoose.Types.ObjectId(),
      salary: 10000,
      finalSalary: 10000
    });
    await worker.save();
    workerId = worker._id;
  });

  afterEach(async () => {
    // Clean up test data
    await Advance.deleteMany({ subdomain });
    await Worker.deleteMany({ subdomain });
    await Admin.deleteMany({ subdomain });
  });

  describe('POST /api/advances', () => {
    it('should create a new advance voucher and deduct from worker salary', async () => {
      const advanceData = {
        workerId,
        amount: 1000,
        description: 'Test advance'
      };

      const response = await request(app)
        .post('/api/advances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(advanceData)
        .expect(201);

      expect(response.body.message).toBe('Advance voucher created successfully');
      expect(response.body.advance).toHaveProperty('amount', 1000);
      expect(response.body.advance).toHaveProperty('worker', workerId.toString());

      // Check if worker's final salary was updated
      const updatedWorker = await Worker.findById(workerId);
      expect(updatedWorker.finalSalary).toBe(9000); // 10000 - 1000
    });

    it('should not create advance with invalid amount', async () => {
      const advanceData = {
        workerId,
        amount: -500,
        description: 'Invalid advance'
      };

      await request(app)
        .post('/api/advances')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(advanceData)
        .expect(400);
    });
  });

  describe('GET /api/advances', () => {
    it('should get all advances for subdomain', async () => {
      // Create test advance
      await Advance.create({
        worker: workerId,
        amount: 500,
        description: 'Test advance',
        subdomain,
        approvedBy: adminId
      });

      const response = await request(app)
        .get('/api/advances')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('amount', 500);
    });
  });
});