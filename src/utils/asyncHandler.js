const asyncHandler = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export {asyncHandler}
//higher order function: function that can accept function as parameter or can return ; treated as variable
//const asyncHandler = (fn) => {()=>{}}
// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next);
        
//     } catch (error) {
//         res.status(err.code || 500).json({
//             sucess: false,
//             message: err.message
//         })
//     }
// }