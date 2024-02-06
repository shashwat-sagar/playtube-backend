//There functions are hhigher order function as it can accept funnctions as a parameter and return them
//using Promise

const asyncHandler = (fn) => {
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => next(error));
  };
};

export { asyncHandler };

// using try catch
//step1: const asyncHandler = () => {}
//step2: const asyncHandler = (fn) => {()=>{}}
//step3: const asyncHandler = (fn) => () => {}  removed outer curly bracket
//step4: const asyncHandler = (fn) => async () => {} using async await

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
