const ds= artifacts.require("DDoSMitigation");

module.exports = function(deployer) {
  deployer.deploy(ds)
  .then(() => {
    console.log('MessageStorage deployed');
  })
  .catch((err) => {
    console.error('Deployment failed:', err);
  });
};
