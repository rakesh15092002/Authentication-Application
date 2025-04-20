import bcrypt from 'bcryptjs';
import userModel from '../model/userModel.js';
import jwt from 'jsonwebtoken';
import transporter from '../config/nodemailer.js';
import {EMAIL_VERIFY_TEMPLATE ,PASSWORD_RESET_TEMPLATE} from '../config/emailTemplates.js';


//  User Register
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
        return res.json({ success: false, message: "Missing Details" })
    }

    try {

        const existingUser = await userModel.findOne({ email })

        if (existingUser) {
            return res.json({ success: false, message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            name,
            email,
            password: hashedPassword,
        })

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        // sending welcome email

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'Welcom to Authentication App Powerded by Rakesh Maurya gutfufuiyg',
            text: `welcome to authentication app. your account has been created with email id:${email}`
        }
        await transporter.sendMail(mailOptions);

        res.json({ success: true })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// User Login 
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.json({ success: false, message: "Email and Password are required" });

    }
consol.log("outside");
    try {
        consol.log("inside");

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: 'Invalid' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.json({ success: false, message: "Invalid Password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true })

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        res.json({ success: true, message: "Logged Out" })

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}


// send Verification OTP to the User's Email
export const sendVerifyOtp = async (req, res) => {

    try {
        const { userId } = req.body;

        const user = await userModel.findById(userId)

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account Already verified" })
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;


        await user.save();

        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Verification OTP Sending by Rakesh Maurya ',
            // text: `Your OTP is ${otp}. Verify your account using this OTP.`,
            html:EMAIL_VERIFY_TEMPLATE.replace('{{otp}}', otp).replace('{{email}}', user.email)
        }

        await transporter.sendMail(mailOption);
        res.json({ success: true, message: "Verification OTP Sent on Email" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}


export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ success: false, message: "Missing Details" });
    }

    try {
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found"});
        }

        if (!user.verifyOtp || user.verifyOtp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date(user.verifyOtpExpireAt).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP Expired' });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
              userId: user._id,
              email: user.email,
              isAccountVerified: user.isAccountVerified
            }
          });
          

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, data: null });
    }
};



// cheak user is authenticated
export const isAuthenticated = async (req,res)=>{
    try {
        res.json({success:true});
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Send Password Reset OTP
export const sendResetOTP = async (req,res)=>{
    const {email } = req.body;
    if (!email) {
        res.json({success:false,message:'Email is required '})
    }
    try {

        const user = await userModel.findOne({email});
        if(!user){
            res.json({success:false,message:'User not found'});
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000

        await user.save();
        
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP sending by Rakesh Maurya',
            // text: `Your OTP for resettng your password is ${otp}.
            // Use this OTP to proceed with restting our password.`
            html:PASSWORD_RESET_TEMPLATE.replace('{{email}}',user.email).replace('{{otp}}',otp)
        }

        await transporter.sendMail(mailOption);

        return res.json({success:true,message:'OTP sent to your email'})


        
    } catch (error) {
        res.json({success:false,message:error.message});
    }
}

// Reset User Password 

export const resetPassword = async (req,res)=>{
    const {email,otp,newPassword} = req.body;

    if (!email || !otp || !newPassword) {
        return res.json({success:false,message:"Email , OTP , and new password are required"});
    }

    try {
        

        const user = await userModel.findOne({email});
        if (!user) {
            return res.json({success:false,message:"User Is Not Found"});
        }

        if(user.resetOtp === "" || user.resetOtp != otp)
        {
            return res.json({success:false,message:"Invalid OTP"});
        }
        if(user.resetOtpExpireAt < Date.now())
        {
            return res.json({success:false ,message:"OTP Expired"})
        }
        const hashedPassword = await bcrypt.hash(newPassword,10);
        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
         
        await user.save();
        res.json({success:true,message:'Password has been reset successfully'});


    } catch (error) {
        return res.json({success:false,message:error.message});
    }
}
