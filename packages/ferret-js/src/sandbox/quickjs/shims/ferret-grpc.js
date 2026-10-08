const addFerretGrpcRequestShimToContext = require('./grpc/ferret-grpc-request');
const addFerretGrpcResponseShimToContext = require('./grpc/ferret-grpc-response');

/**
 * Installs `fer.grpc` onto the `fer` object the fer shim has already put on the global, so it has
 * to run after it.
 */
const addFerretGrpcShimToContext = (vm, grpc) => {
  const ferObject = vm.getProp(vm.global, 'fer');
  const grpcObject = vm.newObject();

  const { evalCode: requestEvalCode } = addFerretGrpcRequestShimToContext(vm, grpc.request, grpcObject);
  // `response` is absent in `beforeCallStart`, which has no response yet.
  const { evalCode: responseEvalCode } = grpc.response
    ? addFerretGrpcResponseShimToContext(vm, grpc.response, grpcObject)
    : { evalCode: [] };

  vm.setProp(ferObject, 'grpc', grpcObject);
  grpcObject.dispose();
  ferObject.dispose();

  // The list code reaches its target through `globalThis.fer.grpc`, so it can only run now that
  // `grpc` is on `fer`. Each block is braced on its own — every bridge declares the same consts.
  for (const code of [...requestEvalCode, ...responseEvalCode].filter(Boolean)) {
    vm.evalCode(`{ ${code} }`);
  }
};

module.exports = addFerretGrpcShimToContext;
