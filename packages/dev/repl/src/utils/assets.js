// @flow
type Asset = {|
  name: string,
  content: string,
  isEntry?: boolean,
  diagnostics?: Array<CodeMirrorDiagnostic>,
|};
export type Assets = Array<Asset>;

export type CodeMirrorDiagnostic = {|
  from: number,
  to: number,
  severity: 'info' | 'warning' | 'error',
  source: string,
  message: string,
|};

export type AssetAction =
  | {|
      type: 'updateAsset',
      name: string,
      prop: 'isEntry',
      value: $PropertyType<Asset, 'isEntry'>,
    |}
  | {|
      type: 'updateAsset',
      name: string,
      prop: 'diagnostics',
      value: $PropertyType<Asset, 'diagnostics'>,
    |}
  | {|
      type: 'updateAsset',
      name: string,
      prop: string,
      value: string,
    |}
  | {|
      type: 'removeAsset',
      name: string,
    |}
  | {|
      type: 'setAssets',
      assets: Assets,
    |}
  | {|
      type: 'addAsset',
    |};

export function updateAssets(
  assets: Assets,
  name: string,
  prop: string,
  value: mixed,
): Assets {
  return assets.map(a => (a.name === name ? {...a, [prop]: value} : a));
}
export function assetsReducer(assets: Assets, action: AssetAction): Assets {
  if (action.type === 'setAssets') {
    return action.assets;
  } else if (action.type === 'updateAsset') {
    const {name, prop, value} = action;
    if (prop === 'name' && assets.find(a => a.name === value)) {
      return [...assets];
    } else {
      if (prop === 'content') {
        assets = updateAssets(assets, name, 'time', Date.now());
        assets = updateAssets(assets, name, 'diagnostics', null);
      }
      return updateAssets(assets, name, prop, value);
    }
  } else if (action.type === 'removeAsset') {
    const {name} = action;
    return assets.filter(a => a.name !== name);
  } else if (action.type === 'addAsset') {
    let nameIndex = 0;
    while (
      assets.find(
        v => v.name == 'new' + (nameIndex ? `-${nameIndex}` : '') + '.js',
      )
    ) {
      nameIndex++;
    }

    return [
      ...assets,
      {
        name: 'new' + (nameIndex ? `-${nameIndex}` : '') + '.js',
        content: '',
        isEntry: false,
      },
    ];
  }

  throw new Error('Unknown action');
}
assetsReducer.setAssets = (assets: Assets) => ({type: 'setAssets', assets});
assetsReducer.changeName = (name: string, newName: string) => ({
  type: 'updateAsset',
  name,
  prop: 'name',
  value: newName,
});
assetsReducer.changeContent = (name: string, content: string) => ({
  type: 'updateAsset',
  name,
  prop: 'content',
  value: content,
});
assetsReducer.changeEntry = (name: string, isEntry: boolean) => ({
  type: 'updateAsset',
  name,
  prop: 'isEntry',
  value: isEntry,
});
assetsReducer.addDiagnostics = (
  name: string,
  diagnostics: Array<CodeMirrorDiagnostic>,
) => ({
  type: 'updateAsset',
  name,
  prop: 'diagnostics',
  value: diagnostics,
});
assetsReducer.remove = (name: string) => ({type: 'removeAsset', name});
assetsReducer.add = () => ({type: 'addAsset'});

export const ASSET_PRESETS = {
  Javascript: [
    {
      name: 'src/index.js',
      content: `import {Thing, x} from "./other.js";\nnew Thing().run();`,
      isEntry: true,
    },
    {
      name: 'src/other.js',
      content: `class Thing {\n  run() {\n    console.log("Test");\n  } \n}\n\nconst x = 123;\nexport {Thing, x};`,
    },
  ],
  Babel: [
    {
      name: 'src/index.js',
      content: `class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toString() {
        return \`(\${this.x}, \${this.y})\`;
    }
}

console.log(new Point(1,2).toString());
`,
      isEntry: true,
    },
    {
      name: '.babelrc',
      content: `{ "presets": [["@babel/env", {"loose": true}]] }`,
    },
    // {
    //   name: 'src/package.json',
    //   content: `{\n "devDependencies": {\n  "@babel/core": "^7.3.4",\n  "@babel/preset-env": "^7.3.4"\n  }\n}`,
    // },
  ],
  'Basic Page': [
    {
      name: 'src/index.html',
      content: `<head>
  <link rel="stylesheet" type="text/css" href="./style.css">
</head>
<body>
  <a href="./other.html">Link</a>
  <script src="./index.js"></script>
</body>`,
      isEntry: true,
    },
    {
      name: 'src/index.js',
      content: `function func(){
 return "Hello World!";
}
document.body.append(document.createTextNode(func()))`,
    },
    {
      name: 'src/style.css',
      content: `body {\n  color: red;\n}`,
    },
    {
      name: 'src/other.html',
      content: 'This is a different page',
    },
    {
      name: '.htmlnanorc',
      content: `{\n  minifySvg: false\n}`,
    },
    {
      name: 'cssnano.config.js',
      content: `module.exports = {\n  preset: [\n    'default',\n    {\n      svgo: false\n    }\n  ]\n}`,
    },
  ],
  JSON: [
    {
      name: 'src/index.js',
      content: "import x from './test.json';\nconsole.log(x);",
      isEntry: true,
    },
    {name: 'src/test.json', content: '{a: 2, b: 3}'},
  ],
  Envfile: [
    {
      name: 'src/index.js',
      content: 'console.log(process.env.SOMETHING);',
      isEntry: true,
    },
    {name: '.env', content: 'SOMETHING=124'},
  ],
  Typescript: [
    {
      name: 'src/index.ts',
      content: `function greeter(person: string) {
    return "Hello, " + person;
}

let user = "Jane User";

document.body.innerHTML = greeter(user);`,
      isEntry: true,
    },
  ],
  //   Markdown: [
  //     {
  //       name: 'src/Article.md',
  //       content: '# My Title\n\nHello, ...\n\n```js\nconsole.log("test");\n```\n',
  //       isEntry: true,
  //     },
  //     {
  //       name: '.htmlnanorc',
  //       content: `{\n  minifySvg: false\n}`,
  //     },
  //   ],
  //   SCSS: [
  //     {
  //       name: 'src/style.scss',
  //       content: `$colorRed: red;
  // #header {
  //   margin: 0;
  //   border: 1px solid $colorRed;
  //   p {
  //     color: $colorRed;
  //     font: {
  //       size: 12px;
  //       weight: bold;
  //     }
  //   }
  //   a {
  //     text-decoration: none;
  //   }
  // }`,
  //       isEntry: true,
  //     },
  //     {
  //       name: 'cssnano.config.js',
  //       content: `module.exports = {\n  preset: [\n    'default',\n    {\n      svgo: false\n    }\n  ]\n}`,
  //     },
  //   ],
  //   LESS: [
  //     {
  //       name: 'src/style.less',
  //       content: `@some-color: #143352;

  // #header {
  //   background-color: @some-color;
  // }
  // h2 {
  //   color: @some-color;
  // }`,
  //       isEntry: true,
  //     },
  //     {
  //       name: 'cssnano.config.js',
  //       content: `module.exports = {\n  preset: [\n    'default',\n    {\n      svgo: false\n    }\n  ]\n}`,
  //     },
  //   ],
};
