import { supabase } from "./supabaseClient";

const uploadUtils = async (file) => {
    // Check if Supabase client is initialized
    if (!supabase) {
        console.warn("Supabase client not initialized. File upload feature is disabled.");
        return null;
    }
    
    if (!file) {
        console.error("No file provided for upload");
        return null;
    }

    const filePath = `user-photos/${Date.now()}_${file.name}`;

    try {
        const { error: uploadError } = await supabase
            .storage
            .from('user-photos')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Upload failed:", uploadError.message);
            return null;
        }

        const { data } = await supabase
            .storage
            .from('user-photos')
            .getPublicUrl(filePath);

        console.log("Uploaded file URL:", data.publicUrl);
        return data.publicUrl;
    } catch (error) {
        console.error("Error during file upload:", error);
        return null;
    }
};

export default uploadUtils;