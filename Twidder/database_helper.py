import sqlite3
from flask import g

def connect_db():
    return sqlite3.connect("database.db")
   
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect_db()
    return db

def close_connection():
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=()):
	conn = get_db()
	cur = conn.execute(query, args)
	entry = cur.fetchall()
	cur.close()
	conn.commit()
	return entry if entry else None

def init(app):
    with app.app_context():
        c = get_db()
        c.execute("drop table if exists users")    
        c.execute("drop table if exists messages")
        c.execute("drop table if exists logged_in_users")    
        cursor = c.cursor()
        f = open('schema.sql','r')
        sql = f.read()
        cursor.executescript(sql) 
        c.commit()

def add_message(email, message):
    c = get_db()
    c.execute("insert into messages (email, user_message) values (?,?)", (email, message))
    c.commit()


def find_user(email):
    c = get_db()
    cursor = c.cursor()
    cursor.execute("select * from users where email= '" + email + "'")
    entry = [dict(email=row[0], password=row[1], firstname=row[2], familyname=row[3], gender=row[4], city=row[5], country=row[6]) for row in cursor.fetchall()]
    return entry

def add_user(email, password, firstname, familyname, gender, city, country):
    c = get_db()
    c.execute("insert into users (email, psw, firstname, familyname, gender, city, country) values (?,?,?,?,?,?,?)", (email, password, firstname, familyname, gender, city, country))
    c.commit()

def add_logged_in_user(email, token, private_key):
    c = get_db()
    c.execute("insert into logged_in_users (email, token, private_key) values (?, ?, ?)", (email, token, private_key))
    c.commit()

def get_logged_in_user(token):
    user = query_db("select * from logged_in_users where token = ?", [token])
    return user

def get_logged_in_user_by_email(email):
    user = query_db("select * from logged_in_users where email = ?", [email])
    return user

def remove_logged_in_user(token):
    removed_user = query_db("delete from logged_in_users where token=?", [token])
    return removed_user

def remove_logged_in_user_by_email(email):
    removed_user = query_db("delete from logged_in_users where email=?", [email])
    return removed_user

def change_password(email, newpassword):
    query_db("update users set psw = ? where email = ?", [newpassword, email])

def get_user_messages(email):
    c = get_db()
    cursor = c.cursor()
    cursor.execute("select * from messages where toEmail= '" + email + "'")
    messages = [dict(fromEmail=row[1], message=row[3]) for row in cursor.fetchall()]
    return messages

def post_message(fromEmail, toEmail, user_message):
    c = get_db()
    c.execute("insert into messages (fromEmail, toEmail, user_message) values (?, ?, ?)", (fromEmail, toEmail, user_message))
    c.commit()
