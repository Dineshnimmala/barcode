module.exports = async function (context, req) {
  context.log('HTTP trigger function processed a request.');
  
  const body = req.body;

  if (!body || !body.barcode) {
    context.res = {
      status: 400,
      body: "Please pass barcode in request body"
    };
    return;
  }

  context.res = {
    status: 200,
    body: `Received barcode: ${body.barcode}`
  };
};
