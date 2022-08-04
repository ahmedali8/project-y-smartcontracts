module.exports = {
  istanbulReporter: ["html", "lcov"],
  skipFiles: ["test"],
  mocha: {
    grep: "@skip-on-coverage", // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
};
