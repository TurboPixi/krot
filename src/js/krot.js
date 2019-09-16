const {ContainerController} = require('./controllers/container-controller');
const {SpriteController} = require('./controllers/sprite-controller');
const {TextController} = require('./controllers/text-controller');
const {makeUniqueName} = require('./utils');
const {defaultRawUi} = require('./config');
const {populate, init} = require('krot-pixi');
const {Handler} = require('./handler');
const {History} = require('./history');
const {Ground} = require('./ground');
const {GUI} = require('dat.gui');
const PIXI = require('pixi.js');

init(PIXI);

class Krot {
  constructor() {
    this.createGui();
    const getParams = () => [new GUI({width: 400}), () => this.getHash(), this.ground.debugGraphics];
    this.spriteController = new SpriteController(...getParams());
    this.containerController = new ContainerController(...getParams());
    this.textController = new TextController(...getParams());
    this.controllers = [this.containerController, this.spriteController, this.textController];
    this.history = new History();
    this.selectedObject = null;
    this.hash = {};

    // window.addEventListener('blur', () => this.history.save());
    // window.addEventListener('beforeunload', () => this.history.save());
    window.addEventListener('blur', () => this.history.putIfChanged(this.handler.getRawUi()), true);

    window.addEventListener('click', (e) => {
      const classes = ['function', 'slider'];

      if (e.target.type === 'checkbox' || classes.find(name => e.target.classList.contains(name))) {
        this.history.putIfChanged(this.handler.getRawUi());
      }
    }, true);

    this.controllers.forEach(c => c.onTreeChange.add(() => this.refreshTreeAndHash()));
    this.setRawUi();
    this.ground.align();
    this.handler.new();
    this.history.put(this.handler.getRawUi());

    window.onbeforeunload = (e) => {
      if (this.handler.isChanged() && confirm('Save current file?')) {
        e.returnValue = false;
        return this.handler.save();
      }
    };
  }

  new() {
    const cb = () => {
      this.setRawUi();
      this.handler.new();
      this.ground.align();
      this.history.clear();
      this.history.put(this.handler.getRawUi());
    };

    if (this.handler.isChanged() && confirm('Save current file?')) {
      return this.handler.save(cb);
    }

    cb();
  }

  open() {
    if (this.handler.isChanged() && confirm('Save current file?')) {
      return this.handler.save();
    }

    this.handler.open(() => {
      this.ground.align();
      this.history.clear();
      this.history.put(this.handler.getRawUi());
    });
  }

  save() {
    this.handler.save();
  }

  saveAs() {
    this.handler.saveAs();
  }

  undo() {
    const rawUi = this.history.undo();
    rawUi && this.setRawUi(rawUi);
  }

  redo() {
    const rawUi = this.history.redo();
    rawUi && this.setRawUi(rawUi);
  }

  moveDown() {
    if (!this.selectedObject || this.selectedObject === this.ground.tree) return;

    const children = this.selectedObject.parent.children;
    const index = children.indexOf(this.selectedObject);

    if (index === -1 || index === 0) return;

    children[index] = children[index - 1];
    children[index - 1] = this.selectedObject;
    this.refreshTreeAndHash();
  }

  moveUp() {
    if (!this.selectedObject || this.selectedObject === this.ground.tree) return;

    const children = this.selectedObject.parent.children;
    const index = children.indexOf(this.selectedObject);

    if (index === -1 || index === children.length - 1) return;

    children[index] = children[index + 1];
    children[index + 1] = this.selectedObject;
    this.refreshTreeAndHash();
  }

  destroy() {
    if (!this.selectedObject || this.selectedObject === this.ground.tree) return;

    if (!confirm(`Destroy ${this.selectedObject.name} and its children?`)) return;

    this.selectedObject.destroy();
    this.refreshTreeAndHash();
    this.selectedObject.controller.hide();
    this.selectedObject = null;
  }

  clone() {
    if (!this.selectedObject || this.selectedObject === this.ground.tree) return;

    const rawUi = this.handler.getRawUi();
    const stack = [this.selectedObject];
    const originNameCopyNameMap = {};

    const makeCopyName = name => {
      const _index = name.lastIndexOf('_');

      if (_index === -1 || isNaN(Number(name.slice(_index + 1)))) {
        return makeUniqueName(name, this.hash);
      }

      return makeUniqueName(name.slice(0, _index), this.hash);
    };

    while (stack.length) {
      const object = stack.pop();
      const index = rawUi.list.findIndex(v => v.name === object.name);
      const item = rawUi.list[index];
      const copy = JSON.parse(JSON.stringify(item));
      copy.name = makeCopyName(item.name);
      copy.parent = originNameCopyNameMap[item.parent] || this.selectedObject.parent.name;
      originNameCopyNameMap[item.name] = copy.name;
      this.hash[copy.name] = copy;
      rawUi.list.splice(index + 1, 0, copy);

      stack.push(...object.children);
    }

    this.setRawUi(rawUi);
    this.history.put(rawUi);
  }

  getHash() {
    return this.hash;
  }

  setRawUi(rawUi = defaultRawUi) {
    const layout = {};

    populate(layout, rawUi);

    this.ground.clean();
    this.ground.setTree(layout[rawUi.list[0].name]);

    rawUi.list.forEach((raw) => {
      const object = layout[raw.name];
      object.controller = this[`${raw.type.toLowerCase()}Controller`];
      object.class = raw.class;
    });

    this.widthController.setValue(rawUi.width);
    this.heightController.setValue(rawUi.height);

    this.refreshTreeAndHash();

    if (this.selectedObject) {
      const controller = this.selectedObject.controller;
      this.selectedObject = this.hash[this.selectedObject.name];
      this.selectedObject ? controller.setObject(this.selectedObject) : controller.hide();
    }
  }

  createGui() {
    const ground = new Ground();
    const handler = new Handler((rawUi) => this.setRawUi(rawUi), ground);
    const gui = new GUI();

    const viewGui = gui.addFolder('View');
    const widthController = viewGui.add(ground, 'width', 0);
    const heightController = viewGui.add(ground, 'height', 0);

    [widthController, heightController]
      .forEach(controller => controller.step(10));

    this.widthController = widthController;
    this.heightController = heightController;
    this.treeGui = gui.addFolder('Tree');
    this.handler = handler;
    this.ground = ground;
    this.gui = gui;
  }

  container() {
    const container = new PIXI.Container();
    container.controller = this.containerController;
    this.add(container, 'container');
  }

  sprite() {
    const sprite = new PIXI.Sprite();
    sprite.controller = this.spriteController;
    this.add(sprite, 'sprite');
  }

  text() {
    const text = new PIXI.Text('New Text');
    text.controller = this.textController;
    this.add(text, 'text');
  }

  // Methods
  add(object, prefix) {
    object.name = makeUniqueName(prefix, this.hash);
    object.class = '';
    (this.selectedObject || this.ground.tree).addChild(object);

    this.refreshTreeAndHash();
    this.selectObject(object);
    this.history.put(this.handler.getRawUi());
  }

  selectObject(object) {
    this.controllers.forEach(c => c.hide());
    this.selectedObject = object;
    object.controller.setObject(object);
    object.controller.show();
  }

  refreshTreeAndHash() {
    this.gui.removeFolder(this.treeGui);
    this.treeGui = this.gui.addFolder('Tree');
    this.treeGui.domElement.classList.add('full-width-property');
    this.treeGui.open();
    this.hash = {};

    const traverse = (object, prefix) => {
      this.hash[object.name] = object;
      const name = `${prefix}${object.name}`;
      this.treeGui.add({[name]: () => this.selectObject(object)}, name);
      object.children.forEach(child => traverse(child, `⠀${prefix}`));
    };

    traverse(this.ground.tree, '');
  }
}

module.exports = Krot;
