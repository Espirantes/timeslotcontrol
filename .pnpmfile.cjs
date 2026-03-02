// Allow build scripts for required packages
module.exports = {
  hooks: {
    readPackage(pkg) {
      return pkg;
    }
  }
};
