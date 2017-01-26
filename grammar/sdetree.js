const fs = require('fs');
const app = require('commander');
const R = require('ramda');

const sdetree = (function() {
  let buf = '';
  let indent = -1;
  function printTree(treefile) {
    const tree = fs.readFileSync(treefile).toString();
    for (const c of tree) {
      if (c == '(') {
        printBuf();
        indent++;
      }
      buf += c;
      if (c == ')') {
        printBuf();
        indent--;
      }
    }
  }
  function printBuf() {
    buf = buf.trim();
    if (buf) {
      console.log(`${'  '.repeat(indent)}${buf}`);
      buf = '';
    }
  }

  function main() {
    app
      .version('0.2.1')
      .option('-f, --treefile <tree-file>', 'Specify an ANTLR parse tree print')
      .parse(process.argv);

    if (app.treefile) {
      printTree(app.treefile);
    }
    else {
      app.help();
    }
    process.exit(0);
  }
  return {
    main: main
  }
}());

sdetree.main();
