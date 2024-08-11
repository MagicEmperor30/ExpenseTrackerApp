import express from "express";

const router = express.Router();

router.get("/",(req,res)=>{
    res.render("index")
});

router.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        res.redirect("/");
    });
});

export { router as indexRoutes};