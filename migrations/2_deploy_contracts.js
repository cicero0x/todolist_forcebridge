const TodoList = artifacts.require("TodoList");

module.exports = function (deployer) {
  deployer.deploy(TodoList, {gas: 1000000});
};
