import mongoose from "mongoose";
import bcrypt from "bcryptjs";


// here we define what proprieties want a user to have 
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
          required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: { 
        type: String, 
        required: true, 
        enum: ['gestionnaire de stock', 'Administrateur'],
        default: 'gestionnaire de stock'},
    }, { // this will add createdAt and updatedAt fields to the schema
        timestamps: true });

    // this will run before saving a user to the database, we can use it to hash the password before saving it
    userSchema.pre("save", async function () {
        // this will check if the password field
        //  is modified, if it is not modified, we will not hash the password again
        if (!this.isModified("password")) {
            return;
        }

        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
       
    });

    userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
    }

    const User = mongoose.model("User", userSchema);

export default User;