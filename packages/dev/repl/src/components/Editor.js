// @flow
// @jsx h
// eslint-disable-next-line no-unused-vars
import {h} from 'preact';
import {useCallback, useMemo} from 'preact/hooks';
import {memo} from 'preact/compat';
//import path from 'path';

// eslint-disable-next-line no-unused-vars
import {Codemirror} from '@mischnic/codemirror-preact';

import {lineNumbers} from '@codemirror/next/gutter';
import {keymap} from '@codemirror/next/keymap';
import {history, redo, undo} from '@codemirror/next/history';
import {foldGutter} from '@codemirror/next/fold';
import {baseKeymap, indentSelection} from '@codemirror/next/commands';
import {bracketMatching} from '@codemirror/next/matchbrackets';
import {closeBrackets} from '@codemirror/next/closebrackets';
import {specialChars} from '@codemirror/next/special-chars';
import {multipleSelections} from '@codemirror/next/multiple-selections';
import {search, defaultSearchKeymap} from '@codemirror/next/search';
import {defaultHighlighter} from '@codemirror/next/highlight';
// import { autocomplete, startCompletion } from "@codemirror/next/autocomplete";

import {html} from '@codemirror/next/lang-html';
import {javascript} from '@codemirror/next/lang-javascript';
import {css} from '@codemirror/next/lang-css';

//import { esLint } from "@codemirror/next/lang-javascript";
//import Linter from "eslint4b-prebuilt";
import {linting, openLintPanel} from '@codemirror/next/lint';

const Editor = memo(function Editor({
  filename,
  readOnly,
  content,
  onChange,
  diagnostics,
}) {
  const onTextChange =
    onChange &&
    useCallback(view => onChange(view.state.doc.toString()), [onChange]);

  // TODO t373 ?
  //let extension = path.extname(filename).slice(1);
  let extension = filename.split('.').splice(-1)[0];

  const extensions = useMemo(
    () =>
      [
        lineNumbers(),
        specialChars(),
        history(),
        foldGutter(),
        multipleSelections(),
        extension.includes('js') || extension.includes('ts')
          ? javascript()
          : extension === 'html'
          ? html()
          : extension === 'css'
          ? css()
          : null,
        // linter(esLint(new Linter())),
        linting(),
        search({keymap: defaultSearchKeymap}),
        defaultHighlighter,
        bracketMatching(),
        closeBrackets,
        // autocomplete(),
        keymap({
          'Mod-z': undo,
          'Mod-Shift-z': redo,
          Tab: indentSelection,
          // "Mod-u": view => undoSelection(view) || true,
          // [ /Mac/.test(navigator.platform) ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
          // "Ctrl-Space": startCompletion
          'Ctrl-Cmd-l': openLintPanel,
        }),
        keymap(baseKeymap),
      ].filter(Boolean),
    [extension],
  );

  return (
    <Codemirror
      value={content}
      extensions={extensions}
      onTextChange={onTextChange}
      readOnly={readOnly}
      diagnostics={diagnostics}
    />
  );
});

export default Editor;
