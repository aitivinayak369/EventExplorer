const express = require('express');
const path  = require('path');
const engine = require('ejs-mate');
const bodyParser = require('body-parser');
const morgan   = require('morgan');
const formidable = require('formidable');
const nodemailer = require('nodemailer');
const util =require('util');
const User = require('./models/user'); 
const fs =require('fs');
const s3fs =require('s3fs');
const passport = require('passport');
const session = require('express-session');
const MongoStore =require('connect-mongo')(session);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const passportSocketIO = require('passport.socketio');
const socketIO =  require('socket.io');
const request = require('request');
const http = require('http');
const algoliaSearch = require('algoliasearch');
const client = algoliaSearch('','');
const indexE = client.initIndex('eventSchema')
const indexG = client.initIndex('groupSchema');
const Event = require('./models/event');
const Group = require('./models/group');
const Comment = require('./models/comment')
mongoose.Promise=global.Promise;

mongoose.connect('mongodb://localhost:27017/ee').then(()=>{
    console.log('connected to database')
}).catch((err)=>{
    console.log('error mongo:',err)
})

const s3fsImpl = new s3fs('aiti123vinayak',{accessKeyId:'',secretAccessKey:''});
s3fsImpl.create();
//console.log(util.inspect(s3fsImpl.writeFile));
require('./config/passportSetUp')
//+++++++middlewares and configs++++++++
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const crypto = require('crypto');
const isAuthenticated = function(req,res,next)
{
    if(req.isAuthenticated())
    {
        console.log('check',req.isAuthenticated())
        next();
    }
    else{
        req.flash('error','You are not logged in!')
        res.status(401).redirect('/')
    }
}
app.use(morgan('dev'));
//app.disable('view cache')
//console.log(path.join(__dirname,'/public'))
app.use(express.static(path.join(__dirname,'/public')));
//app.engine('hbs',exphbs({defaultLayout:'main',extname:'.hbs'}));
app.use(session({
    saveUninitialized:false,
    resave:false,
    cookie:{httpOnly:true,path:'/'},
    secret:'someSecret',
    store:new MongoStore({mongooseConnection:mongoose.connection})


}));
io.use(passportSocketIO.authorize({
    key:'connect.sid',
    cookieParser:require('cookie-parser'),
    secret:'someSecret',
    store: new MongoStore({mongooseConnection:mongoose.connection}),
    success:onSucess,
    fail:onFailure
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(function(req,res,next)
{
    //console.log('++',req.flash('error'))
    res.locals.error=req.flash('error');
    res.locals.success= req.flash('success');
    next();
})

function onSucess(data,accept)
{
   // console.log('on success',data);
    accept(null,true)
}
function onFailure(data,message,err,accept)
{
    if(err)
    {
        console.error(err)
    }
   // console.log('on fail');
    accept(null,false)
}
io.on('connection',function(socket)
{
    if(socket.request.user.logged_in)
    socket.emit('n',{s:'authSucess'});
})
app.engine('ejs', engine);
app.set('views',__dirname+'/views');
app.set('view engine', 'ejs');
//+++++++++routes++++++++++
//mainForNotloggedin
app.get('/fevicon.ico',(req,res)=>{
    res.end();
})
app.get('/',(req,res)=>{
    if(req.user)
    {
        Event.find({}).then((events)=>{
            res.render('main/main',{user:req.user,createEvent:false,jsFile:null,events:events});
        }).catch((err)=>{
            console.error(err);
        })
       // console.log('Ip Address:',req.headers['x-forwarded-for'] , req.connection);
       // console.log('1 here',req.user)
      
    }
    else{
    console.log('2 here')

    res.status(401).render('main/main',{user:null,createEvent:false,jsFile:null,events:null})
    }
    
})
app.get('/auth/google',passport.authenticate('google',{scope:['email','profile']}));
app.get('/auth/google/redirect',passport.authenticate('google',{successRedirect:'/',failureRedirect:'/',failureFlash:true}));
//mainAfterLogin==>mAF
/* app.get('/mAF',(req,res)=>{
    res.render('main/mainAfterLogin',{createEvent:false,jsFile:'emptyScript.js'});
}); */
app.post('/login',(req,res)=>{
    User.findOne({email:req.body.email}).then((user)=>{
        if(user)
        {
        bcrypt.compare(req.body.password,user.password,(err,res1)=>{
            if(err)
            {
                console.log('here err',user.password)
                console.error(err);
            }
            if(res1)
            {
                console.log('here res',user.password)
                req.logIn(user,(err)=>{
                    if(err)
                    {
                        console.error(err);
                    }
                });
                res.redirect('/');
            }
            else{
                req.flash('error','Wrong password !');
                res.redirect('/');
            }
        })
       }
       else{
           req.flash('error','Account with this email doesn\'t exists')
           res.redirect('/')
       }
    }).catch((err)=>{
        if(err)
        {
            console.error(err);
        }})
})

app.get('/logout',(req,res)=>{
    req.logOut();
    res.redirect('/')
})
app.post('/signup',passport.authenticate('local',{successRedirect:'/',failureRedirect:'/',failureFlash:true}));
app.get('/groupview/:id',(req,res)=>{
    Group.findById(req.params.id).populate('groupAdmin').populate('events').populate('members').populate({path:'comments',populate:{path:'owner',select:'name,profileImage,_id'}}).then((group)=>{
        Comment.find({_id:{$in:group.comments}}).populate({path:'owner',select:['name','_id','profileImage']}).sort({created_at:-1}).then((comments)=>{
            if(req.user)
            {
                console.log(group);
              
               var check = group.members.some((u)=>{
                   return String(u._id)==String(req.user._id);
               })
               if(check){
                   check=1;
               }
               else{
                   check=-1
               }
             ///   console.log('here is check...............',check,req.user._id)
             
                    if(String(req.user._id)==String(group.groupAdmin._id))
                {
                    res.render('main/pGroupManager',{createEvent:false,jsFile:'emptyScript.js',user:req.user,group:group,currentDate: Date.now(),len:group.events.length,members:group.members,comments:comments});
                }
                else{
                    //if(check)
                   // {
                        res.render('main/groupView',{createEvent:false,jsFile:'emptyScript.js',user:req.user,group:group,JEStatus:check,currentDate: Date.now(),len:group.events.length,members:group.members,comments:comments});
                   // }
                   // else{
                   //     res.render('main/groupView',{createEvent:false,jsFile:'emptyScript.js',user:req.user,group:group,JEStatus:check});
                   // }
        
                }
               
                console.log('here it is..',group.groupAdmin._id,req.user._id)
                
                
            }
            else{
                res.render('main/groupView',{createEvent:false,jsFile:'emptyScript.js',user:null,group:group,JEStatus:false,currentDate: Date.now(),len:group.events.length,members:group.members,comments:comments});
            }
        }).catch((err)=>{
            console.error(err);
            res.end('something went wrong')
        })
       
    }).catch((err)=>{
        if(err)
        {
            console.error(err);
        }
    })
    
   
})
app.get('/deletegroup/:gid',isAuthenticated,(req,res)=>{
    Group.findByIdAndDelete(req.params.gid).then(()=>{
        res.redirect('/managegroups/'+req.user._id);
    }).catch((err)=>{
        console.error(err);
    })
})
//.populate({path:'comments',populate:{path:'owner',select:['name','profileImage','_id'],options: { sort: { 'created_at': -1 } }}})
app.get('/eventview/:eid',(req,res)=>{
   // console.log(req.params,)
    Event.findById(req.params.eid).populate('membersAttending').then((event)=>{
        //console.log(event);
     
     if(event)
     {
        Comment.find({_id:{$in:event.comments}}).populate({path:'owner',select:['name','_id','profileImage']}).sort({created_at:-1}).then((comments)=>{
            if(req.user)
            {
             // var check = event.membersAttending.indexOf(req.user._id);
                //console.log(group);
              
                var check = event.membersAttending.some(function(u)
                {
                    return String(u._id)==String(req.user._id);
              }
              )
                console.log('here is check...............',check,req.user._id)
                if(check)
                {
                    check=1
                }
                else{
                    check=-1
                }
                
             
                    
                    if(String(req.user._id)==String(event.organizer))
                    {
                        console.log('+-+-+==================',event.comments)
                        res.render('main/pEventManager',{createEvent:false,jsFile:'emptyScript.js',user:req.user,event:event,membersAttending:event.membersAttending,comments:comments,currentDate:Date.now()});
                    }
                    else{
                        //if(check)
                       // {
                            res.render('main/eventView',{createEvent:false,jsFile:'emptyScript.js',user:req.user,event:event,ANStatus:check,membersAttending:event.membersAttending,comments:comments,currentDate:Date.now()});
                        //}
                       // else{
                        //    res.render('main/eventView',{createEvent:false,jsFile:'emptyScript.js',user:req.user,event:event,ANStatus:check});
                       // }
            
                    }
                console.log('here it is..')
                
                
            }
              else{
                  res.render('main/eventView',{createEvent:false,jsFile:null,event:event,user:null,ANStatus:false,comments:comments,membersAttending:event.membersAttending});
              }
        }).catch((err)=>{
            console.error(err)
        })
       
     }
     else{
         res.send('<h1>Sorry this event no more exists!,the organizer  deleted the event (or) wrong url</h1>')
     }
      
    }).catch((err)=>{
        console.error(err);
    })
    
})
app.get('/joingroup/:gid',isAuthenticated,(req,res)=>{
 Group.findByIdAndUpdate(req.params.gid,{$push:{members:req.user._id}}).then(()=>{
     User.findByIdAndUpdate(req.user._id,{$push:{memberGroups:req.params.gid}}).then(()=>{
        res.status(200).end('');
     }).catch((err)=>{
         console.error(err);
     })
    
 }).catch((err)=>{
     console.error(err);
 })
})
app.get('/exitgroup/:gid',isAuthenticated,(req,res)=>{
    Group.findByIdAndUpdate(req.params.gid,{$pull:{members:req.user._id}}).then(()=>{
        User.findByIdAndUpdate(req.user._id,{$pull:{memberGroups:req.params.gid}}).then(()=>{
            res.status(200).end('');
        }).catch((err)=>{
            console.error(err);
        })
        
    }).catch((err)=>{
        if(err)
        {
            console.error(err);
        }
    })
})
app.get('/attend/:eid',isAuthenticated,(req,res)=>{
    Event.findByIdAndUpdate(req.params.eid,{$push:{membersAttending:req.user._id}}).then(()=>{
        User.findByIdAndUpdate(req.user._id,{$push:{attendEvents:req.params.eid}}).then(()=>{
            res.status(200).end('');
        }).catch(()=>{
            console.error(err);
        })
    }).catch((err)=>{
        console.error(err);
    })
})
app.get('/notattend/:eid',isAuthenticated,(req,res)=>{
    Event.findByIdAndUpdate(req.params.eid,{$pull:{membersAttending:req.user._id}}).then(()=>{
        User.findByIdAndUpdate(req.user._id,{$pull:{attendEvents:req.params.eid}}).then(()=>{
            res.status(200).end('');
        }).catch(()=>{
            console.error(err);
        })
    }).catch((err)=>{
        console.error(err);
    })
})
app.get('/managegroups/:id',isAuthenticated,(req,res)=>{
    
        
        res.render('main/manageGroups',{createEvent:false,jsFile:'emptyScript.js',user:req.user,groupM:req.user.memberGroups,groupC:req.user.createdGroups})

      
    })

app.get('/manageevents/:id',isAuthenticated,(req,res)=>{
  res.render('main/manageEvents',{createEvent:false,jsFile:'emptyScript.js',user:req.user,eventsA:req.user.attendEvents,eventsC:req.user.createdEvents})
  console.log('here me',req.user.attendEvents,req.user.createdEvents)

})
app.get('/particulargroupmanager',isAuthenticated,(req,res)=>{
    res.render('main/pGroupManager')
  })
  app.get('/particulareventmanager',isAuthenticated,(req,res)=>{
    res.render('main/pEventManager')
  })
  app.get('/eventcreation',isAuthenticated,(req,res)=>{
      if(req.user)
      res.render('main/eventCreationPage',{createEvent:true,jsFile:'eventCreationPage.js',user:req.user});
  })
  //group
 /*  app.post('/testroute',(req,res)=>{
      var x= JSON.stringify({name:'vinayak',age:'20'});
      request.post({url:'http://localhost:3031/mailsender',json:true,body:x},(err,resp,body)=>{
          console.log(body);
          res.end('sent post request..')
      })
  }) */
  //request.post({url:'http://localhost:3031/mailsender',body:{mailRecievers:'vinayak',groupName:String('group.groupName')},json:true},(err,resp,body)=>{})
                      
  app.post('/group/eventcreation/:gid',isAuthenticated,(req,res)=>{
    var form = new formidable.IncomingForm();

    form.parse(req,(err,fields,files)=>{
        if(err)
        {
            console.log(err);
            res.end('error occured in uploading the file')
        }
        console.log('Date:=============',fields.date);
        requesstAddresss=fields.country+','+fields.postalCode+','+fields.city+','+fields.street+','+fields.landmarkVenue;
        request('https://maps.googleapis.com/maps/api/geocode/json?address='+requesstAddresss+'&key=',(err,response,body)=>{
            //{
             // console.error('err',err);
            //  console.log('res',response);
              /* console.log('body',body)
              console.log('+++Fields',fields);
              console.log('++files',files); */
              const info = JSON.parse(body);
              console.log('info.................',info)
              var streamu = fs.createReadStream(files.image.path);
              const imageArray= files.image.name.split('.')
                  const imageExtension= imageArray[imageArray.length-1];                                                                                                                                                                                                                                                                                                           //
                 //info.results[0].geometry.location.lat,info.results[0].geometry.location.lng
              const event = new Event({eventName:fields.eventName,category:fields.category,content:fields.content,location:fields.country+
                  ','+fields.state+','+fields.city+','+ fields.street+','+fields.landmarkVenue,organizer:req.user._id,organizerShortInfo:req.user.name+
                  ', contact:'+req.user.email,attendanceLimit:fields.attendenceLimit,lat:17,lang:19,extName:imageExtension,Date:fields.date,Time:fields.time})
              event.save().then((event)=>{
                  const imageName=String(event._id+'.'+imageExtension);
                  console.log('imageName++++++++++',event._id)
                  //{
                    User.findByIdAndUpdate(req.user._id,{$push:{createdEvents:event._id}}).then(()=>{
                        //from here grp udate
                        Group.findById(req.params.gid).populate('members').then((group)=>{
                
                            var x= {x:group.members,groupName:String(group.groupName),eventID:event._id};
                            request.post({url:'http://localhost:3031/mailsender',body:x,json:true},(err,resp,body)=>{
                                if(err)
                                {
                                    console.error(err);
                                }
                                console.log('sent...')
                               s3fsImpl.writeFile(imageName,streamu,{ACL:'public-read',"ContentType":"image/jpeg"},function(err){
                                   console.log(err,'up');
                                   //files.image.disposition='inline;filename='+files.image.name;
                                   if(err)
                                   {
                                       console.error(err);
                                       res.end(String(err));
                                   }
                                   group.events.push(event._id);
                            group.save().then(()=>{
                               req.flash('success','Event created successfully')
                                   res.redirect('/managegroups/'+req.user._id);
                            })
                                   
                     
                               })
                            })
                            
                         
                        }).catch((err)=>{
                            console.error(err);
                        })
                       })
                  //}
                 
              }).catch((err)=>{
                  console.error(err)
              })
              
            //}
            
        })
       
      })
  })
  app.get('/group/eventcreation/:gid',(req,res)=>{
      res.render('main/groupEventCreation',{gid:req.params.gid,user:req.user,jsFile:'eventCreationPage.js',createEvent:true})
  })
  app.post('/eventcreation',isAuthenticated,(req,res)=>{
    var form = new formidable.IncomingForm();

      form.parse(req,(err,fields,files)=>{
          if(err)
          {
              console.log(err);
              res.end('error occured in uploading the file')
          }
          console.log('Date:=============',fields.date);
          requesstAddresss=fields.country+','+fields.postalCode+','+fields.city+','+fields.street+','+fields.landmarkVenue;
          request('https://maps.googleapis.com/maps/api/geocode/json?address='+requesstAddresss+'&key=',(err,response,body)=>{
              //{
               // console.error('err',err);
              //  console.log('res',response);
                /* console.log('body',body)
                console.log('+++Fields',fields);
                console.log('++files',files); */
                const info = JSON.parse(body);
                console.log('info.................',info)
                var streamu = fs.createReadStream(files.image.path);
                const imageArray= files.image.name.split('.')
                    const imageExtension= imageArray[imageArray.length-1];                                                                                                                                                                                                                                                                                                           //
                   //info.results[0].geometry.location.lat,info.results[0].geometry.location.lng
                const event = new Event({eventName:fields.eventName,category:fields.category,content:fields.content,location:fields.country+
                    ','+fields.state+','+fields.city+','+ fields.street+','+fields.landmarkVenue,organizer:req.user._id,organizerShortInfo:req.user.name+
                    ', contact:'+req.user.email,attendanceLimit:fields.attendenceLimit,lat:17,lang:19,extName:imageExtension,Date:fields.date,Time:fields.time})
                event.save().then((event)=>{
                    const imageName=String(event._id+'.'+imageExtension);
                    console.log('imageName++++++++++',event._id)
                   User.findByIdAndUpdate(req.user._id,{$push:{createdEvents:event._id}}).then(()=>{
                    s3fsImpl.writeFile(imageName,streamu,{ACL:'public-read',"ContentType":"image/jpeg"},function(err){
                        console.log(err,'up');
                        //files.image.disposition='inline;filename='+files.image.name;
                        if(err)
                        {
                            console.error(err);
                        }
                        req.flash('success','Event created successfully')
                        res.redirect('/');
          
                    })
                   }).catch((err)=>{
                       console.error(err);
                   })
                }).catch((err)=>{
                    console.error(err)
                })
                
              //}
              
          })
         
        })
      //console.log(req.body);
   // res.render('main/eventCreationPage',{createEvent:true,jsFile:'eventCreationPage.js'});
})
app.get('/search',(req,res)=>{
    console.log('query.....',req.query)
    if(req.query.searchQuery&&req.query.type)
    {
        if(req.query.type=='event')
        {
            indexE.search(req.query.searchQuery,(err,content)=>{
                console.log('content...',content)
                if(req.user)
                {
                    res.render('main/eventSearchResults',{events:content.hits,user:req.user,createEvent:false,jsFile:null,searchQuery:req.query.searchQuery})
                }
                else{
                    res.render('main/eventSearchResults',{events:content.hits,user:null,createEvent:false,jsFile:null,searchQuery:req.query.searchQuery})
                }
               
            })
        }
        else if(req.query.type=='group')
        {
          indexG.search(req.query.searchQuery,(err,content)=>{
            if(req.user)
            {
                res.render('main/groupSearchResults',{groups:content.hits,user:req.user,createEvent:false,jsFile:null,searchQuery:req.query.searchQuery})
            }
            else{
                res.render('main/groupSearchResults',{groups:content.hits,user:null,createEvent:false,jsFile:null,searchQuery:req.query.searchQuery})
            }
          })
        }     
        else{
            req.flash('error','Your search is invalid, please include type eg:event or group as well as search query ');
            res.redirect('/');
        }
    }
    else{
        req.flash('error','Your search is invalid, please include type eg:event or group as well as search query ');
        res.redirect('/');
    }
  
})
app.post('/search',(req,res)=>{
    res.redirect('/search/?searchQuery='+req.body.searchQuery+'&type='+req.body.groupEvent)
})
  app.get('/groupcreation',isAuthenticated,(req,res)=>{
    res.render('main/groupCreationPage',{createEvent:true,jsFile:'eventCreationPage.js',user:req.user});
});
app.post('/groupcreation',isAuthenticated,(req,res)=>{
    const form = new formidable.IncomingForm();
    form.parse(req,(err,fields,files)=>{
        if(err)
        {
            console.error('res 2......................');
                    res.end('Something went wrong please try after sometime!')
        }
        else{
            const imageArray = files.groupImage.name.split('.');
            const imageExtension =  imageArray[imageArray.length-1];
      const streamv =  fs.createReadStream(files.groupImage.path);
        const group = new Group({groupName:fields.groupName,groupAdmin:req.user._id,content:fields.content,category:fields.category,extName:imageExtension});
        group.save().then((group)=>{
            console.log(fields,files);
            User.findByIdAndUpdate(req.user._id,{$push:{createdGroups:group._id}}).then(()=>{
                const imageName = String(group._id+'.'+imageExtension);
                console.log(imageName);
                s3fsImpl.writeFile(imageName,streamv,{ACL:'public-read',"ContentType":"image/jpeg"},function(err){
                    if(err)
                    {
                        console.error(err);
                        res.end('went wrong!!')
                    }
                    else{
                        console.log('res 1....................')
                    req.flash('success','Group created succesfully!')
                    res.redirect('/');
                    }
    
                })
            }).catch((err)=>{
                console.error(err)
            })
           

        }).catch((err)=>{
            console.error(err);
        })
    }

    })

   // res.render('main/groupCreationPage',{createEvent:true,jsFile:'eventCreationPage.js'});
})
/* app.get('/profileinfo',(req,res)=>{
    res.render('main/profileInfo',{createEvent:false,jsFile:null,user:req.user,memberInGroups:req.user.memberGroups,createdGroups:created});
}) */
app.get('/profileinfo/:pid',(req,res)=>{
    User.findById(req.params.pid).populate('memberGroups').populate('createdGroups').then((user)=>{
        if(user){
            if(user.profilePrivacy!='private')
    {
     if(user.memberGroupPrivacy=='public')
     {
        if(user.ownGroupPrivacy=='public')
        {
            console.log(user)
            res.render('main/profileInfo',{createEvent:false,jsFile:null,user:user,memberInGroups:user.memberGroups,createdGroups:user.createdGroups});
        }
        else{
            res.render('main/profileInfo',{createEvent:false,jsFile:null,user:user,memberInGroups:user.memberGroups,createdGroups:null});
        }
     }
     else{
        if(user.ownGroupPrivacy=='public')
        {
            res.render('main/profileInfo',{createEvent:false,jsFile:null,user:user,memberInGroups:null,createdGroups:user.createdGroups});
        }
        else{
            res.render('main/profileInfo',{createEvent:false,jsFile:null,user:user,memberInGroups:null,createdGroups:null});
        }
     }
    }
    else{
        res.render('main/NOP',{message:'This user profile cannot be viewed!'})
    }
        }else{
            res.end('<h1>No such user exists!</h1>')
        }
    }).catch((err)=>{
        console.error(err);
        res.end('<h1>Something went wrong!<h1>')
    })
})
app.get('/profilesettings',isAuthenticated,(req,res)=>{
    res.render('main/profileSettingsPage',{createEvent:false,jsFile:null,user:req.user});
})

app.get('/deleteevent/:eid',(req,res)=>{
    Event.findByIdAndDelete(req.params.eid).then(()=>{
        
        res.redirect('/manageevents/'+req.user._id)
    }).catch((err)=>{
        console.error(err)
        res.end('Something went wrong!')
    })
})
app.post('/event/addcomment/:eid',isAuthenticated,(req,res)=>{
    var comment = new Comment({message:req.body.message,owner:req.user._id});
    comment.save().then((com)=>{
        Event.findByIdAndUpdate(req.params.eid,{$push:{comments:com._id}}).then(()=>{
            var x= JSON.stringify(req.user);
            res.status(200).json(x);
        }).catch((err)=>{
            console.error(err);
            res.status(400).end('')
        })
    }).catch((err)=>{
        console.error(err);
            res.status(400).end('')
    })
})
app.post('/group/addcomment/:gid',isAuthenticated,(req,res)=>{
    var comment = new Comment({message:req.body.message,owner:req.user._id});
    comment.save().then((com)=>{
        Group.findByIdAndUpdate(req.params.gid,{$push:{comments:com._id}}).then(()=>{
            var x= JSON.stringify(req.user);
            res.status(200).json(x);
        }).catch((err)=>{
            console.error(err);
            res.status(400).end('')
        })
    }).catch((err)=>{
        console.error(err);
            res.status(400).end('')
    })
})

// profile setting routes

app.post('/changeOwnGroupPrivacy',isAuthenticated,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{ownGroupPrivacy:req.body.privacy}).then(()=>{
        var user=   req.user;
                user.profilePrivacy  =req.body.privacy
        req.login(user,(err)=>{
            console.error(err)
        });
        res.status(200).end('');
    }).catch((err)=>{
        console.error(err)
    })
})
app.post('/changeMemberGroupPrivacy',isAuthenticated,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{memberGroupPrivacy:req.body.privacy}).then(()=>{
        var user=   req.user;
        user.profilePrivacy  =req.body.privacy
req.login(user,(err)=>{
    console.error(err)
});
res.status(200).end('');
    }).catch((err)=>{
        console.error(err)
    })
})
app.post('/changeProfilePrivacy',isAuthenticated,(req,res)=>{
    console.log(req.body,'here it should be')
    User.findByIdAndUpdate(req.user._id,{profilePrivacy:req.body.privacy}).then(()=>{
      var user=   req.user;
                user.profilePrivacy  =req.body.privacy
        req.login(user,(err)=>{
            console.error(err)
        });
        res.status(200).end('');
    }).catch((err)=>{
        console.error(err)
    })
})
server.listen(3030,()=>{
    console.log("Listening to port:",3030);
})