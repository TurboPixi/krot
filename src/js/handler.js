const stringifyObject = require('stringify-object');
const { remote } = require('electron');
const fs = require('fs');

const token = '/* raw */';

class Handler {
  constructor(setRawUi, ground) {
    this.setRawUi = setRawUi;
    this.ground = ground;
    this.filePath = '';
    this.savedJson = '';
  }

  new() {
    this.filePath = '';
    this.savedJson = JSON.stringify(this.getRawUi());
  }

  isChanged() {
    return this.savedJson !== JSON.stringify(this.getRawUi());
  }

  open(filePath, cb) {
    const file = fs.readFileSync(filePath, 'utf8');
    let rawUi = null;
    eval(`rawUi = ${file.split(token)[1]}`);
    this.setRawUi(rawUi);
    this.filePath = filePath;
    cb();
  }

  save(cb) {
    if (!this.filePath) {
      return this.saveAs(cb);
    }

    const classHash = {};
    const hash = {};

    const writeClasses = (classes, name) => classes.forEach(className => {
      classHash[className] = classHash[className] || [];
      classHash[className].push(name);
    });

    const data = this.getRawUi(writeClasses, hash);
    const fields = data.list.map(raw => raw.name);
    const classFields = Object.keys(classHash).filter(name => classHash[name].length !== 0);

    const file = `import { populate } from 'krot-pixi';

const rawUi = ${token}${stringifyObject(data)};${token}

export default class {
  constructor(filter) {
${fields.map(name => `    this.${name} = null;`).join('\n')}`
      + (classFields.length ? '\n\n' : '') +
      `${classFields.map(name => `    this.${name} = [];`).join('\n')}

    populate(this, rawUi, filter);
  }
}
`;

    fs.writeFile(this.filePath, file, () => {
      this.savedJson = JSON.stringify(data);
      cb && cb();
    });
  }

  saveAs(cb) {
    remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
      filters: [{
        extensions: ['js'],
        name: '',
      }],
    }, (filePath) => {
      if (!filePath) return;
      this.filePath = filePath;
      this.save(cb);
    });
  }

  getRawUi(writeClasses = () => '', hash = {}) {
    const data = {
      width: this.ground.width,
      height: this.ground.height,
      list: [],
    };

    const stack = [this.ground.tree];

    while (stack.length) {
      const object = stack.shift();
      hash[object.name] = object.controller.getSaveObject(object);
      data.list.push(hash[object.name]);
      stack.push(...object.children);

      const classes = object.class.split(/\s+/).filter(v => v);
      writeClasses(classes, object.name);
    }

    return data;
  }
}

module.exports = { Handler };
