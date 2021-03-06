module.exports = class IconComponent {
  createModel() {
    return {
      key: '',
      x: '',
      y: '',
      scale: {x: 1, y: 1},
      texture: '',
    };
  }

  addDescriptor(control, iconIndex) {
    control.descriptor = control.descriptor || {
      set(value) {
        const model = app.getModel();
        const iconIndex = model.icons.find((ic, i) => i === iconIndex);
        const icons = [...model.icons];

        _.setWith(icons, `[${iconIndex}].${control.prop}`, value);
        app.updateItem({icons}, true);
      },
      get() {
        const model = app.getModel();
        return _.get(model, `icons[${iconIndex}].${control.prop}`);
      },
    };
  }

  getControls() {
    const iconIndex = app.data.minorComponentData;

    const controls = [
      {prop: 'key'},
      {prop: 'x', step: 1},
      {prop: 'y', step: 1},
      {prop: 'scale.x'},
      {prop: 'scale.y'},
      {
        prop: 'texture',
        descriptor: {
          set(texture) {
            const model = app.getModel();

            app.updateItem({
              icons: model.icons.map((ic, i) => i === iconIndex ? {...ic, texture} : ic),
            }, true);
          },
          get() {
            const model = app.getModel();
            const icon = model.icons[iconIndex];

            return icon.texture;
          },
        },
      },
      {
        prop: 'remove', descriptor: {
          value() {
            const model = app.getModel();
            app.setData({minorComponent: null}, true);
            app.updateItem({icons: model.icons.filter((ic, i) => i !== iconIndex)}, true);
          },
        },
      },
    ];

    controls.forEach((control) => this.addDescriptor(control, iconIndex));

    return controls;
  }
};
