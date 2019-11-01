const _ = require('lodash');
const {GUI} = require('dat.gui');

class Controller {
  constructor(object, config) {
    krot.controller && krot.controller.destroy();
    krot.controller = this;

    this.settings = config || krot.config.controllers[object.constructor.name];
    this.gui = new GUI();
    this.gui.width = 300;
    this.object = object;

    this.settings.getFields(object).forEach((field) => {
      const descriptor = field.descriptor || {
        set: (value) => {
          _.set(object, field.prop, value);
          this.gui.updateDisplay();
        },
        get: () => {
          return _.get(object, field.prop);
        },
      };

      const context = {};
      Object.defineProperty(context, field.prop, descriptor);

      const controller = field.color ? this.gui.addColor(context, field.prop) : this.gui.add(context, field.prop, field.list);
      ['name', 'min', 'max', 'step'].forEach((v) => v in field && controller[v](field[v]));
    });
  }

  destroy() {
    this.destroy = () => void 0;
    this.gui.destroy();
  }

  debug(debugGraphics) {
    this.settings.debug && this.settings.debug(this.object, debugGraphics);
  }
}

module.exports = {Controller};
