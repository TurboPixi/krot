const floatPrecision = 0.001;

const getNameField = (object) => ({
  prop: 'name',
  descriptor: {
    set: (value) => {
      if (!value || krot.hash[value] || krot.classesHash[value]) return;
      object.name = value;
      krot.refreshTreeAndHash();
    },
    get: () => object.name,
  },
});

const getClassField = (object) => ({
  prop: 'class',
  descriptor: {
    set: (value) => object.raw.class = value,
    get: () => object.raw.class || '',
  },
});

const getParentField = (object) => ({
  prop: 'parent',
  list: (() => {
    const hash = Object.assign({}, krot.hash);

    const filter = (object) => {
      delete hash[object.name];
      object.children.forEach(filter);
    };

    filter(object);
    return Object.keys(hash);
  })(),
  descriptor: {
    set: (value) => {
      const parent = krot.hash[value];
      parent.addChild(object);
      krot.refreshTreeAndHash();
    },
    get: () => object.parent.name || '',
  },
});

const debugPosition = (object, graphics) => {
  const position = graphics.toLocal(object, object.parent);
  graphics.beginFill(0xA9B7C6, 1);
  graphics.drawCircle(position.x, position.y, 4);
};

module.exports = {
  floatPrecision,
  getNameField,
  getClassField,
  getParentField,
  debugPosition,
};