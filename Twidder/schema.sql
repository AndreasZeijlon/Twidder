CREATE TABLE users(
email VARCHAR(255),
psw VARCHAR(255),
firstname VARCHAR(255),
familyname VARCHAR(255),
gender VARCHAR(255),
city VARCHAR(255),
country VARCHAR(255),
PRIMARY KEY(email)
);

CREATE TABLE messages(
id INT, 
fromEmail VARCHAR(255), 
toEmail VARCHAR(255),
user_message VARCHAR(255),
PRIMARY KEY(id)
);


CREATE TABLE logged_in_users(
    email VARCHAR(255),
    token VARCHAR(255),
    private_key VARCHAR(255),
    PRIMARY KEY(email)
);