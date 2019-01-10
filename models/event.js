const mongoose = require('mongoose');
const mongooseAlgolia= require('mongoose-algolia');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
    eventName: {
        type: String,
        required: [true, 'event name required']
    },
    category: String,
    content: String,
    titleImage: String,
    attendanceLimit: String,
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    membersAttending:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    organizer:mongoose.Schema.Types.ObjectId,
    organizerShortInfo:String,
    landmarkVenue:String,
    lang:Number,
    lat:Number,
    location:String,
    extName:String,
   
    Date:{
        type:Date,
        
    },
    Time:String
});
eventSchema.plugin(mongooseAlgolia,{
    appId: '2U7STUMUPD',
    apiKey: '85043e5fea69485367e24167e180441e',
    indexName: 'eventSchema', //The name of the index in Algolia, you can also pass in a function
    selector: 'eventName category content titleImage _id landmarkVenue location extName', //You can decide which field that are getting synced to Algolia (same as selector in mongoose)
    defaults: {
      author: 'unknown'
    },
    
    debug: true // Default: false -> If true operations are logged out in your console
  });
  
  
  let Model = mongoose.model('Event', eventSchema);
  
  Model.SyncToAlgolia(); //Clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)
  Model.SetAlgoliaSettings({
    searchableAttributes: ['eventName','category','landmarkVenue','location','content'] //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
  });
module.exports =  Model ;