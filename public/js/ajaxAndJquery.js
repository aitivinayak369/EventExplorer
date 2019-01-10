$(document).ready(function()
{
    $('#JEButton').click(function(){
        var  gid= $('.JEGID').val();
        var check = $('.JEStatus').val();
        console.log(check);
        if(check==-1)
        {
            $.get('/joingroup/'+gid,function(data,status){
               
            if(status=='success')
            {
                $('#JEButton').html('Exit Group').addClass('btn-danger').removeClass('btn-primary');

                $('.JEStatus').val(1);
            }
            })
        }
        else if(check===false){
           $('#login').click();
        }
        else{
            $.get('/exitgroup/'+gid,function(data,status){
                if(status=='success')
                {
                    $('#JEButton').html('Join Group').addClass('btn-primary').removeClass('btn-danger');
                    $('.JEStatus').val(-1);
                    
                }
                })
        }
        
    })
    $('#ANButton').click(function(){
        var  eid= $('.ANEID').val();
        var check = $('.ANStatus').val();
        console.log(check);
        if(check==-1)
        {
            $.get('/attend/'+eid,function(data,status){
               
            if(status=='success')
            {
                $('#ANButton').html('Not Attend').addClass('btn-success').removeClass('btn-primary');
               var x = parseInt($('#eventAttendingCount').html())+1;
               $('#eventAttendingCount').html(x);
                $('.ANStatus').val(1);
            }
            })
        }
        else if(check===false){
           $('#login').click();
        }
        else{
            $.get('/notattend/'+eid,function(data,status){
                if(status=='success')
                {
                    $('#ANButton').html('Attend').addClass('btn-primary').removeClass('btn-success');
                    var x = parseInt($('#eventAttendingCount').html())-1;
                    $('#eventAttendingCount').html(x);
                    $('.ANStatus').val(-1);
                    
                }
                })
        }
        
    })
    $('#addCommentE').click(function(){
        var message = $('#addCommentMessage').val();
        var eid = $('#eid').val();
        $.post('/event/addcomment/'+eid,{message:message},function(data ,status){
            if(status=='success')
            {
               
                var d= JSON.parse(data);
                $('#commentSection').prepend('<div class=\"row\" > <a href=\"/profileinfo/'+d._id +'\"><p>'+d.name+'</p><img src=\"'+d.profileImage+'\" class=\"max-size:25px border border-radius-3\"></a>'+'<br></div><p >'+message+'</p><hr>' )
            }
        })
    })
    $('#addCommentG').click(function(){
        var message = $('#addCommentMessage').val();
        var gid = $('#gid').val();
        $.post('/group/addcomment/'+gid,{message:message},function(data ,status){
            if(status=='success')
            {
                console.log(data)
                var d= JSON.parse(data);
                $('#commentSection').prepend('<div class=\"row\" > <a href=\"/profileinfo/'+d._id +'\"><p>'+d.name+'</p><img src=\"'+d.profileImage+'\" class=\"max-size:25px border border-radius-3\"></a>'+'<br></div><p >'+message+'</p><hr>' )
            }
        })
    })
    $('#changeOwnGroupPrivacy').click(function(){
          var val= $("input[name='ownGroupPrivacy']:checked").val();
         // var userID = $('#userID').val();
          $.post('/changeOwnGroupPrivacy',{privacy:val},function(data,status){
              if(status=='success')
              {
                  console.log(data);
                  window.alert('Created Group Privacy changed to '+val)
              }
          })
    })
    $('#changeMemberGroupPrivacy').click(function(){
        var val= $("input[name='memberGroupPrivacy']:checked").val();
       //var userID = $('#userID').val();
        $.post('/changeMemberGroupPrivacy',{privacy:val},function(data,status){
            if(status=='success')
            {
                console.log(data);
                window.alert('Joined Group Privacy changed to '+val)
            }
        })
  })
  $('#changeProfilePrivacy').click(function(){
    var val= $("input[name='pofilePrivacy']:checked").val();
    console.log(val);
   // var userID = $('#userID').val();
    $.post('/changeProfilePrivacy',{privacy:val},function(data,status){
        if(status=='success')
        {
            console.log(data);
            window.alert('Profile Privacy changed to '+val)
        }
    })
})
})