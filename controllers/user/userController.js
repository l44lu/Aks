const User = require("../../models/userSchema");


const pageNotFound = async(req,res)=>{
    try{
        res.render("page-404");
    }catch(error){
        console.log("the page 404 cant be laoded");
        if(!res.headersSent){
            res.status(404).send("page not found - 404")
        }
    }    


}



const loadHomepage = async (req, res) => {
    try {
        res.render("home"); // Ensure "views/home.ejs" exists
    } catch (error) {
        console.error("Home page not found:", error);

        if (!res.headersSent) {  // Check if response has already been sent
            res.status(500).send("Server error");
        }
    }
    // to avoid the partial respose this method is better ig
};



const loadSignup = async (req, res) => {
    try {
        res.render("signup"); 
    } catch (error) {
        console.error("page not found:", error);

        if (!res.headersSent) {  
            res.status(500).send("Server error");
        }
    }
   
};


// const loadlogin = async (req, res) => {
//     try {
//         res.render("login"); 
//     } catch (error) {
//         console.error("page not found:", error);

//         if (!res.headersSent) {  
//             res.status(500).send("Server error");
//         }
//     }
  
// };



const loadShopping = async (req, res) => {
    try {
        res.render("shop"); 
    } catch (error) {
        console.error("shop page not found:", error);

        if (!res.headersSent) { 
            res.status(500).send("Server error");
        }
    }

}


const signup =async(req,res)=>{
    const {name1,name2,email,phone,password}=req.body;

    try{
        const newUser = new User({name1,name2,email,phone,password});
        await newUser.save();
        console.log("User saved:", newUser);
        return res.redirect("/")

    }catch(error){
        console.error("Error for save user",error);
        if(!res.headersSent){
            res.status(500).send("Inernal server error")
        }

    }
}




module.exports={
    loadHomepage,
    pageNotFound,
    loadShopping,
    loadSignup,
    // loadlogin,
    signup,
}