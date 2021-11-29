from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
from geventwebsocket import WebSocketError
from gevent.pywsgi import WSGIServer
from flask import Flask, request, app, render_template
from server import app
import math
import random
import database_helper
import json
import os
import re
from flask import Flask
from flask_bcrypt import Bcrypt
import hashlib
import hmac
import binascii
import urllib.parse

app = Flask(__name__, static_url_path='')
bcrypt = Bcrypt(app)

active_sockets = {}

@app.route('/', methods=['GET', 'POST'])
def home():
    return app.send_static_file('client.html')

@app.route('/signin', methods=['POST'])
def sign_in():
    form_data = json.loads(request.data)

    if request.method == 'POST':
        email = form_data['email']
        password = form_data['password']
    
        user = database_helper.find_user(email)
        if not user:
            return json.dumps({'success': False, 'message': 'This user does not exist.'})
        elif password_match(password, user[0]['password']):
            if database_helper.get_logged_in_user_by_email(email):
                # user is already logged in on that email address
                if email in active_sockets:
                    try:
                        ws = active_sockets[email]
                        # send message to other browser
                        ws.send(json.dumps({"success": False, "message": "You have been logged out."}))
                        # close socket here
                        ws.close()
                        del active_sockets[email]
                    except WebSocketError as e:
                        repr(e)
                        print("Websocketerror on sign in: ", e)
                        del active_sockets[email]
                database_helper.remove_logged_in_user_by_email(email)                
            
            token = generate_token()
            private_key = generate_key()
            database_helper.add_logged_in_user(email, token, private_key)
            data = json.dumps({"token": token, "private_key": private_key})
            return json.dumps({"success": True, "message": "Successfully signed in.", "data": data})
        else:
            return json.dumps({'success': False, "message": "Wrong password."})

@app.route('/signup', methods=['POST'])
def sign_up():
    form_data = json.loads(request.data)

    email = form_data['email']
    password = form_data['password']
    firstname = form_data['firstname']
    familyname = form_data['familyname']
    gender = form_data['gender']
    city = form_data['city']
    country = form_data['country']

    if not is_valid_signup(email, password, firstname, familyname, gender, city, country):
        return json.dumps({'success': False, "message": "Invalid data"})
    elif database_helper.find_user(email):
        return json.dumps({'success': False, 'message': "User already exists."})
    else:
        hashed_password = create_hash(password)
        database_helper.add_user(email, hashed_password, firstname, familyname, gender, city, country)
        return json.dumps({'success': True, 'message': "Successfully created a new user."})

def is_valid_signup(email, password, firstname, familyname, gender, city, country):
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return False
    if (len(password) < 3):
        return False
    if not firstname:
        return False
    if not familyname:
        return False
    if not(gender == "female" or gender == "male"):
        return False
    if not city:
        return False
    if not country:
        return False
    return True

@app.route('/signout', methods=['POST'])
def sign_out():
    # close socket here
    public_key = request.headers.get('Authorization')
    hmac_data = request.headers.get('hmac')

    token = verify_token(public_key, hmac_data, '/signout')
    if token is not None:
        user = database_helper.get_logged_in_user(token)
        if user:
            email = user[0][0]
            if email in active_sockets:
                active_sockets[email].close()
                del active_sockets[email]

                database_helper.remove_logged_in_user(token)
                return json.dumps({'success': True, "message": "Successfully signed out."})

    return json.dumps({"success": False, "message": "You are not signed in."})



@app.route('/changepassword', methods=['POST'])
def change_password():
    data = json.loads(request.data)
    client_email = request.headers.get('Authorization')
    hmac_data = request.headers.get('hmac')

    oldpassword = data['oldpassword']
    newpassword = data['newpassword']
    repeatedpassword = data['repeatedpassword']

    token = verify_token(client_email, hmac_data, '/changepassword'+oldpassword+newpassword+repeatedpassword)

    if token is not None:
        user = database_helper.find_user(client_email)[0]

        if password_match(oldpassword, user['password']):
            hashed_password = create_hash(newpassword)
            database_helper.change_password(user['email'], hashed_password)
            return json.dumps({"success": True, "message": "Password changed."})
        else:
            return json.dumps({"success": False, "message": "Wrong password."})
    else:
        return json.dumps({"success": False, "message": "You are not signed in."})


@app.route('/getuserdatabytoken', methods=['GET'])
def get_user_data_by_token():
    client_email = request.headers.get('Authorization')
    hmac_data = request.headers.get('hmac')

    token = verify_token(client_email, hmac_data, '/getuserdatabytoken')

    if token is not None:
        return get_user_data_by_email(client_email, client_email, hmac_data, token)
    else:
        return json.dumps({"success": False, "message": "You are not signed in"})


@app.route('/getuserdatabyemail/<email>', methods=['GET'])
def get_user_data_by_email(client_email=None, email=None, hmac_data=None, token=None):
    if client_email is None:
        client_email = request.headers.get('Authorization')
        hmac_data = request.headers.get('hmac')
        token = verify_token(client_email, hmac_data, '/getuserdatabyemail/'+email)



    if token is not None:
        if database_helper.get_logged_in_user_by_email(client_email) is None:
            return json.dumps({"success": False, "message": "You are not signed in"})
        else:
            data = database_helper.find_user(email)
            if not data:
                # user does not exist
                return json.dumps({"success": False, "message": "No such user."})
            else:
                return json.dumps({"success": True, "message": "User data retrieved", "data": data})
    else:
        return json.dumps({"success": False, "message": "You are not signed in"})

@app.route('/getusermessagesbytoken', methods=['GET'])
def get_user_messages_by_token():
    
    client_email = request.headers.get('Authorization')
    hmac_data = request.headers.get('hmac')

    token = verify_token(client_email, hmac_data, '/getusermessagesbytoken')

    if token is not None:
        email = database_helper.get_logged_in_user(token)[0][0]
        if(email is not None):
            message_data = database_helper.get_user_messages(email)
            return json.dumps({"success": True, "message": "User messages retrieved", "data": message_data})
    else:
        return json.dumps({"success": False, "message": "You are not signed in"})


@app.route('/getusermessagesbyemail/<email>', methods=['GET'])
def get_user_messages_by_email(email=None):
    client_email = request.headers.get('Authorization')
    hmac_data = request.headers.get('hmac')

    token = verify_token(client_email, hmac_data, '/getusermessagesbyemail/'+email)

    if token is not None:
        if database_helper.get_logged_in_user(token) is None:
            return json.dumps({"success": False, "message": "You are not signed in."})
        else:
            user = database_helper.find_user(email)
            if user is None:
                return json.dumps({"success": False, "message": "No such user."})
            else:
                message_data = database_helper.get_user_messages(email)
                return json.dumps({"success": True, "message": "User messages retrieved.", "data": message_data})
    else:
        return json.dumps({"success": False, "message": "You are not signed in."})


@app.route('/postmessage', methods=['POST'])
def post_message():
    client_email = request.headers.get('Authorization')
    hmac_data = request.headers.get('x-hmac')
    body = json.loads(request.data)

    data = body['data']
    hmac_data = body['hmac_data']

    message = data['message']
    toEmail = data['toEmail']

    token = verify_token(client_email, hmac_data, '/postmessage'+message+toEmail)

    if token is not None:
        user = database_helper.get_logged_in_user(token)
        if user is None:
            return json.dumps({"success": False, "message": "You are not signed in."})
        fromEmail = user[0][0]

        if not database_helper.find_user(toEmail):
            return json.dumps({"success": False, "message": "No such user."})

        database_helper.post_message(fromEmail, toEmail, message)

        return json.dumps({"success": True, "message": "Successfully posted message."})
    else:
        return json.dumps({"success": False, "message": "You are not signed in"}) 

@app.route('/connectsocket')
def web_socket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        # get token and email from client browser
        obj = ws.receive()
        data = json.loads(obj)

        try:
            # check if not logged in
            if not (database_helper.get_logged_in_user(data['token'])):
                ws.send(json.dumps({"sucess": False, "message": "You are not signed in."}))

            active_sockets[data['email']] = ws

            # keep socket open
            while True:
                obj = ws.receive()
                if obj is None:
                    # page refresh or leaving the website -> close websocket
                    if data['email'] in active_sockets:
                        del active_sockets[data['email']]
                    ws.close()
                    return ''

        except WebSocketError as e:
            repr(e)
            print("WebSocketError")
            if data['email'] in active_sockets:
                del active_sockets[data['email']]
    return ''


def verify_token(client_email, client_hmac, parameters=""):
    if database_helper.get_logged_in_user_by_email(client_email):
        user = database_helper.get_logged_in_user_by_email(client_email)[0]
        token = user[1]
        private_key = user[2]
        
        data = urllib.parse.quote(token+client_email+parameters, safe='')
        server_hmac = hmac.new(private_key.encode('utf-8'), data.encode('utf-8'), hashlib.sha512)
        server_hmac = server_hmac.hexdigest()
        
        print()    
        print("-------------------------------verifytoken-----------------------------------")
        print("data used for encryption: ", data)
        print("server's hmac: ", server_hmac)
        print("client's hmac: ", client_hmac)
        print("-------------------------------verifytoken-----------------------------------")
        print()

        if hmac.compare_digest(client_hmac.encode('utf-8'), server_hmac.encode('utf-8')):
            return token
        else:
            return None
    else:
        return None

def create_hash(password):
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    return hashed_password

def password_match(password, hashed_password):
    return bcrypt.check_password_hash(hashed_password, password)

def generate_key():
    return binascii.hexlify(os.urandom(32)).decode('utf-8')

def generate_token():
    letters = "abcdefghiklmnopqrstuvwwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    token = ""
    for i in range(0,36):
        token += letters[math.floor(random.random() * len(letters))]
    return token

if __name__ == '__main__': 
    #database_helper.init(app)
    app.debug = True
    http_server = WSGIServer(('', 5000), app,  handler_class=WebSocketHandler)
    http_server.serve_forever()
