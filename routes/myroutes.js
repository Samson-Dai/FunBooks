var express = require('express');
var router = express.Router();
var books_per_page = 8  //define the books dispalyed on each page

/* Load the homepage. */
router.get('/loadpage', function(req, res) {
    var db = req.db;
    var cate = req.query.category;
    var page = parseInt(req.query.page);
    var queries = {};
    var books = db.get('bookCollection');  // define the collection
    if(cate != "nil"){
        queries = {category: cate};
    }
    
    books.find(queries,{sort:{title:1}, fields:{title:1, authorList:1, price:1, coverImage:1}},function(err,docs){
        if (err === null){
            var total_pages = Math.ceil(docs.length /books_per_page) ; // compute the total number of pages 
            var start_pos = (page-1)*books_per_page;
            var end_pos = docs.length;
            if (start_pos+books_per_page < end_pos){
                end_pos = start_pos+books_per_page;
            }
            var books_to_display = []
            for (var i=start_pos; i<end_pos; i++){
                books_to_display.push(docs[i])
            }

            output={"categories": [], "books_to_display": books_to_display, "total_pages": total_pages}
            if(cate == "nil"){ // we need to get all categories 
                books.distinct('category', function(err,docs){ // we need to get all categories 
                    output["categories"] = docs
                    //check whether there is a user session
                    if (req.session.userId){
                        var id = {_id: req.session.userId};
                        var users = db.get('userCollection');
                        users.find(id,{fields:{name:1, totalnum:1}},function(err,docs){
                             output["name"] = docs[0].name;
                             output["totalnum"] = docs[0].totalnum;
                             res.json(output)
                        }); 
                    }else{
                        output["name"] = null;
                        res.json(output)
                    }
                }); 
            }else{
                //check whether there is a user session
                if (req.session.userId){
                    var id = {_id: req.session.userId};
                    var users = db.get('userCollection');
                    users.find(id,{fields:{name:1, totalnum:1}},function(err,docs){
                         output["name"] = docs[0].name;
                         output["totalnum"] = docs[0].totalnum;
                         res.json(output)
                    }); 
                }else{
                    output["name"] = null;
                    res.json(output)
                }
            }
        }
            
        else res.send({msg: err});
    });

});

/* Load a book. */
router.get('/loadbook/:bookid', function(req, res) {
    var db = req.db;
    var id = req.params.bookid;

    var books = db.get('bookCollection');
    books.find({_id: id},{fields:{publisher:1, date:1, description:1}},function(err,docs){
        if (err === null){  
            res.json(docs);
        }
        else res.send({msg: err});
    });  
});

/* Handle user login. */
router.post('/signin', function(req, res) {
    var db = req.db;

    var username = req.body.username;
    var input_password = req.body.password;

    var users = db.get('userCollection');
    users.find({name: username},{fields:{password:1,totalnum:1}},function(err,docs){
        if (err === null){
            var password = docs[0].password;
            var totalnum = docs[0].totalnum;
            
            if(password == input_password){
                req.session.userId = docs[0]._id;   //create a session variable

                var id = {_id :  docs[0]._id};
                var newStatus = {$set:{status: 'online'}};

                users.update(id, newStatus, function (err, result) {
                     res.send({msg: totalnum }); // send totalnumber if matches
                });
            }
            else{
                res.send({msg: 'no' })    // else send not matched
            }
        }
        else{
            console.log(err)
            res.send({msg: err});
        } 
    });  
});

/* Handle user signout. */
router.get('/signout', function(req, res) {
    var db = req.db;

    var id = {_id :  req.session.userId};
    var newStatus = {$set:{status: 'offline'}};

    req.session.userId = null;   //unset a session variable

    var users = db.get('userCollection');
    users.update(id, newStatus, function (err, result) {
         res.send({msg: '' }); // send empty string if success
    }); 
});

/* Handle add to cart. */
router.put('/addtocart', function(req, res) {
    var db = req.db;

    var bookid = req.body.bookid;
    var quantity = req.body.quantity;
    var id = {_id :  req.session.userId};

    var users = db.get('userCollection');
    users.find(id,{fields:{cart:1, totalnum:1}},function(err,docs){
        if (err === null){
            var current_cart = docs[0].cart;
            var current_total = docs[0].totalnum;
            var new_total = current_total+ quantity;

            var already_in_cart = false;
            var newStatus = {}

            for (var i = 0; i < current_cart.length; i++) { //use for loop to check whether the book is already in cart
                if (current_cart[i].bookId === bookid) {
                    already_in_cart = true;
                    current_cart[i].quantity = quantity+ current_cart[i].quantity;   //update the quantity
                    newStatus = {$set:{cart: current_cart, totalnum: new_total}};
                }
            }
            
            if (! already_in_cart){
                var new_item = {bookId: bookid, quantity: quantity};
                current_cart.push(new_item);
                newStatus = {$set:{cart: current_cart, totalnum: new_total}};
            }

            users.update(id, newStatus, function (err, result) {    //update the database
                var books = db.get('bookCollection'); 
                books.find({},{fields:{price:1}},function(err,docs){ //compute the total price of the cart
                    if (err === null){  
                        var book_price_list = docs;
                        var total_price = 0;
                        for (var i = 0; i < current_cart.length; i++) { //use for loop to check whether the book is already in cart
                            for (var j = 0; j < book_price_list.length; j++) {
                                if (current_cart[i].bookId == book_price_list[j]._id) {
                                    total_price += current_cart[i].quantity*book_price_list[j].price;
                                }
                            }
                        }
                        var result_info = {totalnum: new_total, total_price: total_price};

                        res.send({msg: result_info}); // send total number and total price if success
                    }
                    else res.send({msg: err});
                });  
            }); 
        }
        else{
            console.log(err)
            res.send({msg: err});
        } 
    });
});

/* Handle load cart. */
router.get('/loadcart', function(req, res) {
    var db = req.db;
    var id = {_id :  req.session.userId};

    var users = db.get('userCollection');
    users.find(id,{fields:{cart:1, totalnum:1}},function(err,docs){
        if (err === null){
            var current_cart = docs[0].cart;
            var current_total = docs[0].totalnum;
            var new_cart = []
            
            var books = db.get('bookCollection'); 
            books.find({},{fields:{title:1, authorList:1, price:1, coverImage:1}},function(err,docs){ //compute the total price of the cart
                if (err === null){ 
                    var book_list = docs;
                    var temp_item = {};
                    var total_price = 0;
                    for (var i = 0; i < current_cart.length; i++) { //use for loop to check whether the book is already in cart
                        for (var j = 0; j < book_list.length; j++) {
                            if (current_cart[i].bookId == book_list[j]._id) {
                                total_price += current_cart[i].quantity*book_list[j].price;
                                temp_item = book_list[j];
                                temp_item.quantity = current_cart[i].quantity;  //add the quantity to the cart
                                new_cart.push(temp_item);
                            }
                        }
                    }

                    var result_info = {totalnum: current_total, total_price: total_price, cart: new_cart};
                    
                    res.send({msg: result_info}); // send empty string if success
                }
                else res.send({msg: err});
            });  
        }
        else{
            console.log(err)
            res.send({msg: err});
        } 
    });
});


/* Update cart. */
router.put('/updatecart', function(req, res) {
    var db = req.db;

    var bookid = req.body.bookid;
    var quantity = req.body.quantity;
    var id = {_id :  req.session.userId};

    var users = db.get('userCollection');
    users.find(id,{fields:{cart:1, totalnum:1}},function(err,docs){
        if (err === null){
            var current_cart = docs[0].cart;
            var current_total = docs[0].totalnum;

            var already_in_cart = false;
            var newStatus = {}

            for (var i = 0; i < current_cart.length; i++) { //use for loop to search the book is already
                if (current_cart[i].bookId === bookid) {
                    already_in_cart = true;
                    var new_total = current_total+ quantity- current_cart[i].quantity;
                    current_cart[i].quantity = quantity;   //update the quantity
                    newStatus = {$set:{cart: current_cart, totalnum: new_total}};
                    break;
                }
            }
            
            if (! already_in_cart){         // in case this item was deleted and not in the cart array now
                var new_item = {bookId: bookid, quantity: quantity};
                var new_total = current_total+ quantity;
                current_cart.push(new_item);
                newStatus = {$set:{cart: current_cart, totalnum: new_total}};
            }

            users.update(id, newStatus, function (err, result) {    //update the database
                var result_info = {totalnum: new_total};
                res.send({msg: result_info}); // send total number if success  
            }); 
        }
        else{
            console.log(err)
            res.send({msg: err});
        } 
    });
});

/* Delete from cart. */
router.delete('/deletefromcart/:bookid', function(req, res) {
    var db = req.db;

    var bookid = req.params.bookid;
    var id = {_id :  req.session.userId};

    var users = db.get('userCollection');
    users.find(id,{fields:{cart:1, totalnum:1}},function(err,docs){
        if (err === null){
            var current_cart = docs[0].cart;
            var current_total = docs[0].totalnum;
            var newStatus = {}

            for (var i = 0; i < current_cart.length; i++) { //use for loop to serach for the book 
                if (current_cart[i].bookId === bookid) {
                    var new_total = current_total- current_cart[i].quantity;
                    current_cart.splice(i,1);   //remove the book 
                    newStatus = {$set:{cart: current_cart, totalnum: new_total}};
                    break;
                }
            }

            users.update(id, newStatus, function (err, result) {    //update the database
                var result_info = {totalnum: new_total};
                res.send({msg: result_info}); // send total number if success  
            }); 
        }
        else{
            console.log(err)
            res.send({msg: err});
        } 
    });
});


/* Handle checkout. */
router.get('/checkout', function(req, res) {
    var db = req.db;
    var id = {_id :  req.session.userId};
    var newStatus = {$set:{cart: [], totalnum: 0}};

    var users = db.get('userCollection');
    users.update(id, newStatus, function (err, result) {    //update the database
        res.send({msg: ''}); // send empty string if success
    }); 
});

module.exports = router;
