import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded successfully
    console.log("Response from cloudinary", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    console.log("Error occured while uploading the file at cloudinary", error);

    return null;
  }
};

const removeFromCloudinary = async (oldImageURL) => {
  try {
    if (!oldImageURL) return null;
    //remove from cloudinary
    const response = await cloudinary.uploader.destroy(oldImageURL, {
      resource_type: "auto",
    });
    console.log("Respons from cloudinary", response);
    return response;
  } catch (error) {
    console.log("Error occured while removing the file from cloudinary", error);
    return null;
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
