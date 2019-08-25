const _ = require('lodash');

const createControllerBuilder = (handler, gui, prefix = '') => (
  {prop: postfix, min, max, step, list, defaults, color, round},
) => {
  const prop = `${prefix}${postfix}`;

  if (handler[prop] === undefined) {
    Object.defineProperty(handler, prop, {
      set(v) {
        _.set(handler.object, prop, round ? Math.round(v) :
          typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
      },
      get() {
        const v = _.get(handler.object, prop, defaults);
        return v === undefined ? defaults : v;
      },
    });
  }

  const controller = color ? gui.addColor(handler, prop) : gui.add(handler, prop, list);
  controller.name(postfix);
  min !== undefined && controller.min(min);
  max !== undefined && controller.max(max);
  step !== undefined && controller.step(step);

  return controller;
};

module.exports = {createControllerBuilder};
