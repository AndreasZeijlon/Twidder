const MIN_PASSWORD_LENGTH = 3;

window.onload = function() {
  displayView();
};

displayView = function() {
  //the code required to display a view
  if(localStorage.getItem("token")){
    var profileview = document.getElementById("profileview").innerHTML;
    document.getElementById("displayview").innerHTML = profileview;
    loadUserInformation(undefined);
    showWallMessages(undefined);
    connectSocket();
  } else {
    var welcomeview = document.getElementById("welcomeview").innerHTML;
    document.getElementById("displayview").innerHTML = welcomeview;
  }
};

searchUser = function () {
  var email = document.getElementById("searchemail").value;
  var token = localStorage.getItem("token");
  var public_key = localStorage.getItem("email");
  var private_key = localStorage.getItem("private_key");

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);

        if(!response.success) {
          document.getElementById("errorsearchuser").innerHTML = response.message;
        } else {
          document.getElementById("otherusershome").innerHTML = "<div id=\"errorsearchuser\" class=\"errormessage\"></div><div id=\"userinformation1\" class=\"userinfo\"> <h3 class=\"header\">User information:</h3> <label id=\"emailinfo1\">Email: </label> <label id=\"fnameinfo1\">First name: </label><label id=\"famnameinfo1\">Family name: </label><label id=\"genderinfo1\">Gender: </label><label id=\"cityinfo1\">City: </label><label id=\"countryinfo1\">Country: </label></div> <div id=\"wall1\" class=\"wall\"><div class=\"postmessage\"><textarea name=\"wallmessage\" id=\"wallmessage1\">What do you want to tell {1}?</textarea><button class=\"wall-button\" onclick=\"postMessageOnWall(\'{0}\')\">Post</button><button class=\"wall-button\" onclick=\"showWallMessages(\'{0}\')\">Update messages</button></div><div id=\"wallmessages1\" class=\"wallmessages\"></div></div>".format(email, response.data[0].firstname);
          loadUserInformation(email);
          showWallMessages(email);
        }
      }
  };

  hmac_data = create_hmac_data(private_key, token+public_key+"/getuserdatabyemail/"+email)

  xhttp.open("GET", "/getuserdatabyemail/"+email, true);
  xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
  xhttp.setRequestHeader('Authorization', public_key);
  xhttp.setRequestHeader('hmac', hmac_data);
  xhttp.send();

  return false;
};


showWallMessages = function (other) {
  var token = localStorage.getItem("token");
  var private_key = localStorage.getItem("private_key");
  var public_key = localStorage.getItem("email");

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var status = JSON.parse(xhttp.responseText);
        console.log(status.success, status.message);
        if(status.success) {
          if(other){
            document.getElementById("wallmessages1").innerHTML = "";
            for (let i = 0; i < status.data.length; i++) {
              const element = status.data[i];
              document.getElementById("wallmessages1").innerHTML +="<div class=\"message\">User: {0} <br>{1} <br><br></div>".format(element.fromEmail, element.message);
            }
          } else {
            document.getElementById("wallmessages").innerHTML = "";
            for (let i = 0; i < status.data.length; i++) {
              const element = status.data[i];
              document.getElementById("wallmessages").innerHTML += "<div class=\"message\">User: {0} <br>{1} <br><br></div>".format(element.fromEmail, element.message);
            }
          }
        }
        
      }
  };

  if(other) {
    hmac_data = create_hmac_data(private_key, token+public_key+"/getusermessagesbyemail/"+other);
    xhttp.open("GET", "/getusermessagesbyemail/"+other, true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.setRequestHeader('Authorization', public_key);
    xhttp.setRequestHeader('hmac', hmac_data);
    xhttp.send();
  } else {
    hmac_data = create_hmac_data(private_key, token+public_key+"/getusermessagesbytoken")
    xhttp.open("GET", "/getusermessagesbytoken", true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.setRequestHeader('Authorization', public_key);
    xhttp.setRequestHeader('hmac', hmac_data);
    xhttp.send();
  }
};

postMessageOnWall = function(other) {
  var token = localStorage.getItem("token");
  var public_key = localStorage.getItem("email");
  var private_key = localStorage.getItem("private_key");

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);
        showWallMessages(other);
      }
  };

  if (other) {
    var message = document.getElementById("wallmessage1").value;
    toemail = other;
  } else {
    var message = document.getElementById("wallmessage").value;
    toemail = public_key;
  }

  input = {
    message: message,
    toEmail: toemail
  }

  hmac_data = create_hmac_data(private_key, token+public_key+"/postmessage"+input.message+input.toEmail)

  body = {
    data: input,
    hmac_data: hmac_data
  }

  xhttp.open("POST", "/postmessage", true);
  xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
  xhttp.setRequestHeader('Authorization', public_key);
  xhttp.setRequestHeader('x-hmac', hmac_data);
  xhttp.send(JSON.stringify(body));
};

loadUserInformation = function(other) {
  var token = localStorage.getItem("token");
  var public_key = localStorage.getItem("email");
  var private_key = localStorage.getItem("private_key");

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);
        if (response.success) {
          var data = response.data[0];
          if (other) {
            document.getElementById("emailinfo1").innerHTML += data.email;
            document.getElementById("fnameinfo1").innerHTML += data.firstname;
            document.getElementById("famnameinfo1").innerHTML += data.familyname;
            document.getElementById("genderinfo1").innerHTML += data.gender;
            document.getElementById("cityinfo1").innerHTML += data.city;
            document.getElementById("countryinfo1").innerHTML += data.country;
          } else {
            document.getElementById("emailinfo").innerHTML += data.email;
            document.getElementById("fnameinfo").innerHTML += data.firstname;
            document.getElementById("famnameinfo").innerHTML += data.familyname;
            document.getElementById("genderinfo").innerHTML += data.gender;
            document.getElementById("cityinfo").innerHTML += data.city;
            document.getElementById("countryinfo").innerHTML += data.country; 
          }
        }
      }
  };


  if(other) {
    hmac_data = create_hmac_data(private_key, token+public_key+"/getuserdatabyemail/"+other);

    xhttp.open("GET", "/getuserdatabyemail/"+other, true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.setRequestHeader('Authorization', public_key);
    xhttp.setRequestHeader('hmac', hmac_data);
    xhttp.send();
  } else {
    hmac_data = create_hmac_data(private_key, token+public_key+"/getuserdatabytoken");

    xhttp.open("GET", "/getuserdatabytoken", true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.setRequestHeader('Authorization', public_key);
    xhttp.setRequestHeader('hmac', hmac_data);
    xhttp.send();
  } 
}

changePassword = function() {
  token = localStorage.getItem("token"); 
  var private_key = localStorage.getItem("private_key");
  var public_key = localStorage.getItem("email");

  var input = {
    oldpassword: document.getElementById("oldpassword").value,
    newpassword: document.getElementById("newpassword1").value,
    repeatedpassword: document.getElementById("repeatnewpassword2").value
  }

  if(input.newpassword != input.repeatedpassword) {
    document.getElementById("repeatnewpassword2").setCustomValidity('Password must be matching');
    return false;
  } else {
    document.getElementById("repeatnewpassword2").setCustomValidity('');
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);

        document.getElementById("errorchangepassword").innerHTML = response.message;
      }
  };

  hmac_data = create_hmac_data(private_key, token+public_key+"/changepassword"+input.oldpassword+input.newpassword+input.repeatedpassword);


  xhttp.open("POST", "/changepassword", true);
  xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
  xhttp.setRequestHeader('Authorization', public_key);
  xhttp.setRequestHeader('hmac', hmac_data);
  xhttp.send(JSON.stringify(input));

  return false;
}

signOut = function(){
  var token = localStorage.getItem("token");
  var private_key = localStorage.getItem("private_key");
  var public_key = localStorage.getItem("email");

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);

        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("private_key");
        displayView();
      }
  };

  hmac_data = create_hmac_data(private_key, token+public_key+"/signout")

  xhttp.open("POST", "/signout", true);
  xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
  xhttp.setRequestHeader('Authorization', public_key);
  xhttp.setRequestHeader('hmac', hmac_data);
  xhttp.send();
}

openTab = function(tab, evt) {
  var tabs = document.getElementsByClassName("tabs");
  var tablinks = document.getElementsByClassName("tab-button");
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].style.display = "none";
  }
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" marked", "");
  }

  evt.currentTarget.className += " marked";
  document.getElementById(tab).style.display = "block";
}


signIn = function() {

    var input = {
      email: document.getElementById("signinemail").value,
      password: document.getElementById("signinpassword").value
    }

    var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange=function(){
	  		if (this.readyState==4 && this.status==200){
          var response = JSON.parse(xhttp.responseText);
          console.log(response.success, response.message);

          if(response.success) {
            var data = JSON.parse(response.data);
            localStorage.setItem("token", data.token);
            localStorage.setItem("private_key", data.private_key);
            localStorage.setItem("email", input.email);
            displayView();
            return false;
          }
          else {
            document.getElementById("signinmessage").innerHTML = response.message;
      
            return false;
          }
	    	}
    };

    xhttp.open("POST", "/signin", true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.send(JSON.stringify(input));

    return false;
}

signUp = function() {
    var input = {
      email: document.getElementById("email").value, 
      password: document.getElementById("signuppassword").value, 
      repeatedpassword: document.getElementById("repeatedpassword").value,
      firstname: document.getElementById("firstname").value, 
      familyname: document.getElementById("familyname").value, 
      gender: document.getElementById("gender").value, 
      city: document.getElementById("city").value, 
      country: document.getElementById("country").value };

    if(input.password != input.repeatedpassword) {
      document.getElementById("repeatedpassword").setCustomValidity('Password must be matching');
      return false;
    } else {
      document.getElementById("repeatedpassword").setCustomValidity('');
    }
    
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange=function(){
      if (this.readyState==4 && this.status==200){
        var response = JSON.parse(xhttp.responseText);
        console.log(response.success, response.message);

        document.getElementById("signupmessage").innerHTML = response.message;
        return false;
      }
    };

    xhttp.open("POST", "/signup", true);
    xhttp.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhttp.send(JSON.stringify(input));

    return false;
}

validatePasswordMatch = function(input, changePassword) {
  if(changePassword) {
    if (input.value != document.getElementById('newpassword1').value) {
      input.setCustomValidity('Password must be matching.');
    } else {
      // input is valid -- reset the error message
      input.setCustomValidity('');
    }
  } else {
    if (input.value != document.getElementById('signuppassword').value) {
      input.setCustomValidity('Password must be matching.');
    } else {
      // input is valid -- reset the error message
      input.setCustomValidity('');
    }
  }
  
};

validatePasswordLength = function(input, changePassword) {
  if (input.value.length < MIN_PASSWORD_LENGTH) {
    input.setCustomValidity('Password must be atleast {0} characters long'.format(MIN_PASSWORD_LENGTH));
  } else {
    // input is valid -- reset the error message
    input.setCustomValidity('');
    if(changePassword) {
      document.getElementById("repeatnewpassword2").setCustomValidity('');
    } else {
      document.getElementById("repeatedpassword").setCustomValidity('');
    }
  }
};


connectSocket = function() {
  var socket = new WebSocket("ws://"+document.domain+":5000/connectsocket");

  socket.onopen = function() {
    console.log("socket open");
		var data = {"email": localStorage.getItem("email"), "token": localStorage.getItem("token")};
		socket.send(JSON.stringify(data));

  };

  socket.onmessage = function(msg) {
    data = JSON.parse(msg.data);
    if (data.success == false) {
      // signed in on another browser
      signOut();
    }
  };

  socket.onclose = function() {
    console.log("socket close");

  };

  socket.onerror = function() {
    console.log("socket error");
  }
}

create_hmac_data = function(private_key, msg) {
  var hmac = forge.hmac.create();
  hmac.start('sha512', private_key);

  console.log("Encode URI component: " + encodeURIComponent(msg));

  hmac.update(encodeURIComponent(msg));

  hmac_data = hmac.digest().toHex();
  console.log("Hmac data: " + hmac_data);
  return hmac_data;
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}