const mongoose =require('mongoose');
const mongooseAlgolia = require('mongoose-algolia');
const Schema = mongoose.Schema;

const groupSchema= new Schema({
    groupName:{
        type:String,
        required:[true,'group name required']
    },
    category:String,
    content:String,
    groupImage:String,
    members:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    events:[{type:mongoose.Schema.Types.ObjectId,ref:'Event'}],
    groupAdmin:
    {type:mongoose.Schema.Types.ObjectId,
        ref:'User'},
    extName:String,
    comments:[{type:mongoose.Schema.Types.ObjectId,ref:'Comment'}]


})
groupSchema.plugin(mongooseAlgolia,{
    appId: '',
    apiKey: '',
    indexName: 'groupSchema', //The name of the index in Algolia, you can also pass in a function
    selector: 'groupName category content members extName', //You can decide which field that are getting synced to Algolia (same as selector in mongoose)
    defaults: {
      author: 'unknown'
    },
    
    debug: true // Default: false -> If true operations are logged out in your console
  });
  
  
  let Model = mongoose.model('Group',groupSchema);
  
  Model.SyncToAlgolia(); //Clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)
  Model.SetAlgoliaSettings({
    searchableAttributes: ['groupName','category','content'] //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
  });
module.exports =  Model ;
