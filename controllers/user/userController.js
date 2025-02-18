

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
    // to avoid the partial this method is better ig
};




module.exports={
    loadHomepage,
    pageNotFound,
}