/**
 * External library that accesses fer, req, res objects from the VM context.
 * These are available as globals inside the Node VM sandbox.
 *
 * Used to test that npm modules can access fer, req, res context objects.
 */

module.exports = {
  // fer accessors
  getVar: function (name) { return fer.getVar(name); },
  setVar: function (name, value) { fer.setVar(name, value); },
  getEnvVar: function (name) { return fer.getEnvVar(name); },

  // req accessors
  getReqBody: function (options) { return req.getBody(options); },
  getReqHeaders: function () { return req.getHeaders(); },
  getReqMethod: function () { return req.getMethod(); },

  // res accessors
  getResBody: function () { return res.getBody(); },
  getResHeaders: function () { return res.getHeaders(); },
  getResStatus: function () { return res.getStatus(); }
};
