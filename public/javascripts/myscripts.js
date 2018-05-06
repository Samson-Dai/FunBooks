var main_app = angular.module('mainPageApp', []);

main_app.controller('mainController', function($scope, $http){

    // Define a dic to determine which page to show 
    $scope.showPage={main:true, detail: false, signin: false, signout: false, confirm_add: false, cart_content: false, checkout: false}

    //Define a varible to controll whether to show signin bar 
    $scope.showUserInfo = true;

    //Define a vartible to check whether the user is login
    $scope.signinOrNot = false;

    // a variable used to store the previous page inforamtion
    $scope.callback = "main";
    $scope.current_page= "main";

    //Define a function to switch the page
    $scope.switchPage = function(page){
        $scope.callback = $scope.current_page;
        $scope.current_page= page;
        for (var key in $scope.showPage) {
            if (key==page){
                $scope.showPage[key] = true;
            }else{
                $scope.showPage[key] = false;
            }
        }
    };

    // load main page
    $scope.loadMain = function(){
     $http.get("/loadpage?category=nil&page=1").then(function(response){
            var main_page_data = response.data;
            $scope.books_to_display = main_page_data["books_to_display"];
            $scope.book_categories = main_page_data["categories"];
            $scope.total_pages = main_page_data["total_pages"];
            $scope.current_category = "nil";
            $scope.current_page = 1;
            if (main_page_data["name"]){
                $scope.signinOrNot = true;
                $scope.signin_username = main_page_data["name"];
                $scope.totalnum = main_page_data["totalnum"];
            }

        }, function(response){
         alert("Error getting commodity:"+response.statusText);
        });
    };

    //change page number
    $scope.changePage = function(){
        $http.get("/loadpage?category="+$scope.current_category +"&page=" +$scope.current_page).then(function(response){
            var main_page_data = response.data;
            $scope.books_to_display = main_page_data["books_to_display"];
            $scope.total_pages = main_page_data["total_pages"];
            $scope.switchPage("main")
        }, function(response){
            alert("Error getting commodity:"+response.statusText);
        });
    }

    //go previous page
    $scope.previousPage = function(){
        if ($scope.current_page > 1){
            $scope.current_page = $scope.current_page -1;
            $scope.changePage();
        }
    }

    //go next page
    $scope.nextPage = function(){
        if ($scope.current_page < $scope.total_pages){
            $scope.current_page = $scope.current_page +1;
            $scope.changePage();
        }
    }

     // load book for some specific category
     $scope.loadCategory = function(category, page){
        $scope.current_category = category;
        $scope.current_page = page;
        $scope.changePage();
     }

     //continue browsing, load the first page of first category
    $scope.continueBrowsing = function(){
        $scope.loadMain();
    }


     // define a variable to store the information of the book on the detail page and init it as an empty object
     $scope.detail_book = {};

     // load the details for a book
     $scope.loadDetails = function(book){
        $scope.detail_book = {};
        $http.get("/loadbook/"+book._id).then(function(response){
            var raw_data = response.data[0];   // response.data is an array containing only one object
            book.publisher = raw_data.publisher;
            book.date = raw_data.date;
            book.description = raw_data.description;
            $scope.detail_book = book;  //update the the book on the detail page
            $scope.switchPage('detail'); // switch page to the detail page 
        }, function(response){
         alert("Error: "+response.statusText);
        });
     }

    //load the signin page 
    $scope.loadSignin =function(){
        $scope.showUserInfo = false;   //do not show sign/signout button in the signin page
        $scope.login_fail = false;
        $scope.switchPage('signin');
    }

    // handle the signin request
    $scope.handleSignin = function(){
        $scope.login_fail = false;
        if ($scope.signin_username && $scope.signin_password){
            var userInfo = {
                 'username': $scope.signin_username,
                 'password': $scope.signin_password
            }
            $http.post("/signin", userInfo).then(function(response){
                if(response.data.msg !='no'){
                    $scope.totalnum = response.data.msg;
                    $scope.signinOrNot = true;
                    $scope.showUserInfo = true;  //show the sign/signout button again after we signed in     
                    
                    if ($scope.callback == "detail"){     //if the user login when add item, then continue add item
                        $scope.handleAddItem();
                    }else{
                        $scope.switchPage('main');
                    }
                }
                else{
                    alert("Password is incorrect.");
                    $scope.login_fail = true;
                }
            }, function(response){
                 alert("No such user.");
            });
        }
        else{
            alert("You must enter username and password.");
        }
    }

    //load the signout page
    $scope.loadSignout = function(){
        $scope.show_signout_warning  = true;
        if ($scope.totalnum == 0){
            $scope.show_signout_warning = false;
        }
        $scope.switchPage("signout");
    }


    //cancel signout
    $scope.cancelSignout = function(){
        //go back to previous page
        if ($scope.callback == 1){  //this is a sepcial case
            $scope.switchPage("main");
        }else{
            $scope.switchPage($scope.callback);
        }
    }


    //confirm signout
    $scope.confirmSignout = function(){
        $http.get("/signout").then(function(response){
            $scope.signinOrNot = false;
            if ($scope.callback == 1 || $scope.callback == "main"){  //this is a sepcial case
                $scope.switchPage("main");
            }else if($scope.callback == "detail" || $scope.callback=="confirm_add"){
                $scope.switchPage("detail");
            }else{
                $scope.continueBrowsing();
            }
        }, function(response){
            alert("Error: "+response.statusText);
        });        
    }

    //handle the add-to-cart request for some certain book
    $scope.handleAddItem = function(){
        var itemInfo = {
             'bookid': $scope.detail_book._id,
             'quantity': $scope.quantity_to_add
        } 
        if ($scope.signinOrNot){        //if login, show success page
            $http.put("/addtocart",itemInfo).then(function(response){
                $scope.totalnum = response.data.msg.totalnum;
                $scope.total_price = response.data.msg.total_price;

                //need to switch page, fake switch
                $scope.switchPage('confirm_add');
            }, function(response){
                alert("Error: "+response.statusText);
            });    
        }else{      //if not login, show login page
            $scope.loadSignin();
             //need to go the Confirm add page 
        }
    }

    //load the shopping cart
    $scope.loadCart = function(){
         $http.get("/loadcart").then(function(response){
            $scope.totalnum = response.data.msg.totalnum;
            $scope.current_cart_content = response.data.msg.cart;
            $scope.total_price = $scope.getTotal($scope.current_cart_content);

            $scope.switchPage('cart_content'); // switch page to the detail page 
        }, function(response){
         alert("Error: "+response.statusText);
        });
    }

    //handle the quantity change in shopping cart 
    $scope.handleChange = function(quantity, bookid){
        if (quantity != 0){     //update quantity
            var itemInfo = {
                 'bookid': bookid,
                 'quantity': quantity
            } 
            $http.put("/updatecart", itemInfo).then(function(response){
                $scope.totalnum = response.data.msg.totalnum;
                $scope.total_price = $scope.getTotal($scope.current_cart_content);
            }, function(response){
             alert("Error: "+response.statusText);
            });
        }else{      //delete item
            $http.delete("/deletefromcart/"+ bookid).then(function(response){
                $scope.totalnum = response.data.msg.totalnum;
                $scope.total_price = $scope.getTotal($scope.current_cart_content);
            }, function(response){
             alert("Error: "+response.statusText);
            });
        }
    }

    //handle checkout
    $scope.checkout = function(){
        $scope.payment_num =  $scope.totalnum;
        $scope.payment_price=  $scope.total_price;
        $http.get("/checkout").then(function(response){
            $scope.totalnum = 0;
            $scope.total_price= 0;
            $scope.switchPage('checkout'); // switch page to the checkout page
        }, function(response){
         alert("Error: "+response.statusText);
        });
    }

    
    // compute the total price 
    $scope.getTotal = function(current_cart_content){
        var total = 0;
        for(var i = 0; i < current_cart_content.length; i++){
            var product = current_cart_content[i];
            total += (product.price * product.quantity);
        }
        return total;
    }
});

main_app.filter('range', function() {       //define a filter to help us create the quantity range selection
  return function(input, min, max) {
    min = parseInt(min); //Make string input int
    max = parseInt(max);
    for (var i=min; i<max; i++)
      input.push(i);
    return input;
  };
});

