const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
    message: String,
    likes: Number,
    dislikes: Number,
    
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    created_at:{
        type:Date,
        default:Date.now
    }
    

})


module.exports = mongoose.model('Comment', commentSchema);