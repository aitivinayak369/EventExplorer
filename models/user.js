const mongoose = require('mongoose');
const bcrypt= require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name:{
        type:String,
        required:[true,'User name required']
        
    },
    email:{
        type:String,
        unique:true
    },
    googleID:
    {
        type:String,
        default:''
    },
    password:{type:String}
    ,
    memberGroups:[{type:mongoose.Schema.Types.ObjectId,ref:'Group'}],
    createdGroups:[{type:mongoose.Schema.Types.ObjectId,ref:'Group'}],
    notifications:[{type:mongoose.Schema.Types.ObjectId,ref:'Notification'}],
    createdEvents:[{type:mongoose.Schema.Types.ObjectId,ref:'Event'}],
    attendEvents:[{type:mongoose.Schema.Types.ObjectId,ref:'Event'}],
    profileImage:String,
    interests:{
        type:String,
        default:'click change button beside it, to add your interests here..'
    },
    profilePrivacy:{
        type:String,
        default:'public'
    },
    memberGroupPrivacy:{
        type:String,
        default:'public'
    },

    ownGroupPrivacy:{
        type:String,
        default:'public'
    }



});

userSchema.pre('save',function(next)
{  user =this;
    if(user.password!='n')
    {
    bcrypt.genSalt(10,(err,salt)=>{
      bcrypt.hash(user.password,salt,(err,hash)=>{
             if(err)
             {
               next(err) ; 
             }
             user.password=hash;
             console.log('->',user.password);
             console.log('->',hash);
           next();
         });
     });
    }
    else{
        next();
    }
})
module.exports=mongoose.model('User',userSchema);
