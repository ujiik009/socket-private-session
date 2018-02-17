/* โหลด Express มาใช้งาน */
var express = require('express')
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var cors = require('cors');
var QRCode = require('qrcode');
var sprintf = require("sprintf-js").sprintf, vsprintf = require("sprintf-js").vsprintf
var dateFormat = require('dateformat');
var sha1 = require('sha1');
var md5 = require('md5');
var now = new Date();



app.use(express.static('img'));

//เปิด access-control-allow-origin
app.use(cors());

// parse application/json
app.use(bodyParser.json({ limit: '50mb' }));

app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));

/* ใช้ port 7777 หรือจะส่งเข้ามาตอนรัน app ก็ได้ */
var port = process.env.PORT || 7777;


var con = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "app_card"
});


/* สั่งให้ server ทำการรัน Web Server ด้วย port ที่เรากำหนด */
var server_run = app.listen(port, function () {
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";
    console.log(datetime + '  Starting node.js on port ' + port);
});

var user_session_list = {};

var io = require('socket.io').listen(server_run);
io.on("connection", (socket) => {
    console.log("user is connect")
    socket.on('set_session', (message) => {

        // save session id in array
        user_session_list[`${message}`] = socket.id;
        console.log(user_session_list)
    })

    socket.on('disconnect', function () {
        // delete session id user disconnect
        delete user_session_list[find_user_id(socket.id)];
        console.log(user_session_list);
    });
})

// function find user_id by session id
    function find_user_id(session_id){
        for (var key in user_session_list) {
            if (user_session_list.hasOwnProperty(key)) {
                if (user_session_list[key] == session_id){
                    return key;
                }               
            }
        }
        return null;
    }

// function find user_id by session id



con.connect(function (err) {
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";
    
    if (err) throw err;
    console.log(datetime + "  Connected Mysql...");
});

/* Routing */
//เข้าสู่ระบบ
app.post('/login', function (req, res){
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body;
    var email = json.email;
    var pass = json.pass;
    // res.send(req);
    var response = {};
    var check_login = "SELECT * FROM member_table WHERE `u_email` ='" + email + "' AND `u_pass` ='" + md5(sha1(sha1(pass))) + "'";
    con.query(check_login, function (err, result) {
        if (result.length > 0) {
            response['status'] = true;
            response['message'] = 'Login success...';
            response['data'] = result;
            console.log(datetime +"  member login " + result[0].u_id + " :')");
        } else {
            response['status'] = false;
            response['message'] = 'Login fail!!';
            console.log(datetime +"  Login fail fail -0-");
        }
        res.send(JSON.stringify(response));
    });
});


//สมัครสมาชิก  ball
app.post('/register', function (req, res) {
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json  = req.body;
    var email = json.email;
    var pass  = json.pass;
    var full_name = json.fullname;
    var response = {};
    var create = dateFormat(now,'yyyy-mm-dd HH:MM:ss');
    

  
    var check_email = "SELECT * FROM member_table WHERE `u_email` = '"+email+"'";
    con.query(check_email, function (err, result, fields){
        //ตรวจสอบ อีเมล์ซ้ำ
        if (result.length == 0) {
            
            var count = "SELECT COUNT(`u_id`) as account_type FROM `member_table`";
            con.query(count, function (err, result, fields) {
                //นับตัว 
                var count_row = result[0].account_type+1;
                var insert = "INSERT INTO `member_table` (`u_id`, `u_email`, `u_pass`, `account_type`, `u_created`, `last_update`,`u_name`) VALUES ('" + sprintf("%06d", count_row) + "', '" + email + "','" + md5(sha1(sha1(pass))) + "','signin' ,'" + create + "', '" + create + "','" + full_name+"')";
                con.query(insert, function(err, result){
                    //เพิ่มสมาชิก
                    if (result.affectedRows > 0){
                        response['status']  = true;
                        response['message'] = 'Register Account Success';
                        console.log(datetime + "  member create " + result.affectedRows + " row  :')");
                        res.send(JSON.stringify(response));
                    }else{
                        response['status']  = false;
                        response['message'] = 'Register Fail';
                        console.log(datetime + "  insert member fail -0-");
                        res.send(JSON.stringify(response));
                    }
                });
                
            });
        }else{
            response['status'] = false;
            response['message'] = 'Email Duplicate';
            console.log(datetime + "  email duplicate ~_~!");
            res.send(JSON.stringify(response));
        }


    });

})

function update_card(email, name, tel, company, address, position, u_id, res, response){
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var update = "UPDATE member_table SET `u_email` = '" + email + "', `u_name` = '" + name + "', `u_tel` = '" + tel + "', `u_company`= '" + company + "', `u_address` = '" + address + "', `u_position` = '" + position + "' WHERE `u_id` = '" + u_id + "' ";
    con.query(update, function (err, result) {
        if (update) {
            response['status'] = true;
            response['message'] = "update success!!";
            console.log(datetime + "  member update card success!!");
            var sel = "SELECT * FROM member_table WHERE `u_email` = '" + email + "' ";
            con.query(sel, function (err, result) {
                if(sel){
                    response['data'] = result;
                    console.log(datetime + "  return data to client..");
                    res.send(JSON.stringify(response));
                }else{
                    response['data'] = null;
                    console.log(datetime + "  can't return data to client!!");
                    res.send(JSON.stringify(response));
                }
            });
            // res.send(JSON.stringify(response));
        } else {
            response['status'] = false;
            response['message'] = "update fail!!";
            console.log(datetime + "  update update card fail!!");
            res.send(JSON.stringify(response));
        }
    });
}

//เพิ่มข้อมูล นามบัตร
app.post('/update/card', function (req, res) {
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body,
    email = json.email,
    name = json.name,
    tel = json.tel,
    company = json.company,
    address = json.address,
    position = json.position,
    u_id = json.u_id,
    response = {};
    path = "img/avatar/";

    var body = json.img,
        base64Data = body.replace(/data:image\/(.+);base64,/, ""),
        binaryData = new Buffer(base64Data, 'base64').toString('binary');//แปลงจาก base64 เป็น binary
    require("fs").writeFile("base64Data.txt", body, "", () =>{});
    if (body != '') {
        
        require("fs").writeFile(path+u_id+".jpg", binaryData, "binary", function (err) {
            if (err == null) {
                var upload = "UPDATE member_table SET `u_img` = '" + 'avatar/' + u_id + ".jpg" + "', `first_card` = '1' WHERE `u_id` = '" + u_id + "' ";
                con.query(upload, function(err, result){
                    if (upload){
                        console.log(datetime + '  upload success!!');
                        update_card(email, name, tel, company, address, position, u_id, res, response);
                    }else{
                        console.log(datetime + '  upload fail!!');
                    }
                });
            }else{
                console.log(datetime + '  err writeFile');
            }
        });
    }else{
        response['img'] = null;
        console.log(datetime + '  img null');
        update_card(email, name, tel, company, address, position, u_id, res, response);
    }
});

//login socail
app.post('/login/socail', function (req, res){
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body,
    email  = json.email,
    name   = json.name,
    account_type = json.account_type,
    response = {},
    create = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    
    var check_user = "SELECT * FROM member_table WHERE `u_email` = '" + email + "' AND `account_type` = '" + account_type + "' ";
    con.query(check_user, function (err, result) {
        // console.log(check_user);
        if (result.length > 0) {

            response['status'] = true;
            response['message'] = "Login " + account_type + " success!!";
            response['data'] = result;
            console.log(datetime + "  Login witch " + account_type + " success!! from " + email);
            res.send(JSON.stringify(response));

        }else{

            var check_email = "SELECT * FROM member_table WHERE `u_email` = '" + email + "'";
            con.query(check_email, function (err, result, fields) {
                //ตรวจสอบ อีเมล์ซ้ำ
                if (result.length == 0) {
                    var count = "SELECT COUNT(`u_id`) as account_type FROM `member_table`";
                    con.query(count, function (err, result, fields) {
                        //นับ แถว
                        var count_row = result[0].account_type + 1;
                        var insert_socail = "INSERT INTO `member_table` (`u_id`, `u_email`,`u_name`, `account_type`, `u_created`, `last_update`) VALUES ('" + sprintf("%06d", count_row) + "', '" + email + "', '" + name + "', '" + account_type + "', '" + create + "', '" + create + "')";
                        con.query(insert_socail, function (err, result) {
                            //เพิ่มสมาชิก
                            if (result.affectedRows > 0) {
                                response['status'] = true;
                                response['message'] = 'insert success';
                                console.log(datetime + "  member create " + result.affectedRows + " row from " + account_type + " :')");
                                // res.send(JSON.stringify(response));
                                var sel = "SELECT * FROM member_table WHERE `u_email` = '" + email + "' ";
                                con.query(sel, function (err, result) {
                                    if (sel) {
                                        response['data'] = result;
                                        console.log(datetime + "  return data to client..");
                                        res.send(JSON.stringify(response));
                                    } else {
                                        response['data'] = null;
                                        console.log(datetime + "  can't return data to client!!");
                                        res.send(JSON.stringify(response));
                                    }
                                });
                            } else {
                                response['status'] = false;
                                response['message'] = 'insert fail T^T';
                                console.log(datetime + "  insert member fail from " + account_type + " -0-");
                                res.send(JSON.stringify(response));
                            }
                        });
                    });
        
                }else{
                    response['status'] = false;
                    response['message'] = 'email duplicate!!';
                    console.log(datetime + " email duplicate");
                    res.send(JSON.stringify(response));
                }
            });
        }
    });
});

// genarate QRcode
app.post('/getqr', function (req, res){
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body, text = json.text, path = "img/qrcode/", response = {}, server = "/namecard/namecard_server/";
    if (text != '') {
        QRCode.toFile(path+text+'.jpg', text, {
            color: {
                dark: '#000000'  // Blue dots
            }
        }, function (err) {
            // if (err) throw err
            if(err) {
                response['status'] = false;
                console.log(datetime + '  genarate QRcode fail!!');
                res.send(JSON.stringify(response));
            }else{
                response['status'] = true;
                response['path_img'] = "/qrcode/" + text + ".jpg";
                console.log(datetime + '  genarate QRcode success!!');
                res.send(JSON.stringify(response));
            }
        });
        
    }else{
        response['status'] = false;
        response['message'] = "key text = ''";
        console.log(datetime + '  text == ""');
        res.send(JSON.stringify(response));
    }
});

//ค้นหาโดย UID
app.post('/search_user', (req, res)=> {
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body,
        u_id = json.u_id,
        response = {};

        var search = "SELECT `u_id`, `u_name`, `u_img` FROM member_table WHERE `u_id` = '" + u_id + "' ";
        con.query(search, (err, result) => {
            if (result.length > 0){
                response['status'] = true;
                response['data'] = result;
                console.log(datetime +"  search user by UID success...");
                res.send(JSON.stringify(response));
            }else{
                response['status'] = false;
                console.log(datetime + "  search not found by UID!!");
                res.send(JSON.stringify(response));
            }
        });
});

// เพิ่มเพื่อน
app.post('/addcard', (req, res) =>{
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";
    
    try {
        var json = req.body,
            u_id = json.u_id,
            friend_id = json.friend_id,
            response = {};
        console.log(datetime + "  UID :" + u_id + " request friend UID :" + friend_id);
        var check_friend = "SELECT * FROM relationship WHERE (`user_one_id` = '" + u_id + "'  and `user_two_id` ='" + friend_id + "') OR (`user_two_id` = '" + u_id + "'  and `user_one_id` ='" + friend_id+"')";
        con.query(check_friend, (err, result) => {
            if (result.length > 0) {
                console.log(datetime + '  Friend');
                res.send({ status: false, message: "Friend!!!  " });
            }else{
                var sql_add_card = "INSERT INTO `relationship` (`user_one_id`, `user_two_id`, `status`) VALUES ('" + u_id + "', '" + friend_id + "', '1')";
                con.query(sql_add_card);
                console.log(datetime + '  add friend success...');
                var data_user = `SELECT
                        member_table.u_id,
                        member_table.u_name,
                        member_table.u_img
                        FROM
                        member_table 
                        WHERE
                        member_table.u_id = "${u_id}"`;

                
                con.query(data_user,(err,row)=>{

                    io.to(user_session_list[friend_id]).emit("new_card", { icon: row[0].u_img, message: row[0].u_name});
                    res.send({ status: true, message: "add card success!!!  " });
                })
               

                
            }
        });
    } catch (error) {
        res.send({ status: false, message: "query Error" });
    }
   
});

app.post('/save_token', (req, res)=>{
    var json = req.body

    var token = json.token;
    console.log(token);
})

// รายชื่อ card ที่มี
app.post('/list_card', (req, res)=>{
    var date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss');
    var datetime = "[" + date + "]";

    var json = req.body,
        u_id = json.u_id;
       
    var sql_list_card = 'SELECT DISTINCT * FROM relationship WHERE user_one_id = "' + u_id + '" or user_two_id = "' + u_id+'"';

    con.query(sql_list_card,(err,row)=>{
        var data_user = [];
        row.forEach(element => {
           
            if (element.user_one_id == u_id){
                data_user.push(element.user_two_id)
            }else{
                data_user.push(element.user_one_id)
            }
        });

        var data_return = [];
        loop_data_user(data_user).then((data)=>{
            // console.log(data)
            res.send(data);
        }).catch(()=>{
            res.send([]);
        })
        
        //console.log(data_user);
    }) 
    
    function loop_data_user(data_user) {
        return new Promise((resolve, reject)=>{
            try {
                var data_return = [];

                if (data_user.length>0){
                    data_user.forEach((element, index) => {
                        var select_info = `SELECT
                    *
                    FROM
                    member_table
                    WHERE
                    member_table.u_id = "${element}"`;

                        con.query(select_info, (err, row_user) => {
                            data_return.push(row_user[0]);
                      
                            // last index loop
                            if (index == data_user.length - 1) {
                                resolve(data_return)
                            }
                        })
                    })
                }else{
                    resolve(data_return)
                }
               
                
            } catch (error) {
                reject(error)
            }
        });
    }
});

