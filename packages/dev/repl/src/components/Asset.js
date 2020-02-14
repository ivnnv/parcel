// @flow
// @jsx h
// eslint-disable-next-line no-unused-vars
import {h} from 'preact';
import {memo} from 'preact/compat';
import {useCallback} from 'preact/hooks';
import Editor from './Editor';
import {Box} from './helper';

const Asset = memo(function Asset({
  name,
  content,
  isEntry,
  readOnly,
  onChangeName,
  onChangeContent,
  onChangeEntry,
  onClickRemove,
  additionalHeader,
  diagnostics,
  ...props
}) {
  const changeName = useCallback(e => onChangeName(name, e.target.value), [
    name,
    onChangeName,
  ]);
  const changeContent = useCallback(content => onChangeContent(name, content), [
    name,
    onChangeContent,
  ]);
  const changeEntry = useCallback(e => onChangeEntry(name, e.target.checked), [
    name,
    onChangeEntry,
  ]);
  const clickRemove = useCallback(() => onClickRemove(name), [
    name,
    onClickRemove,
  ]);

  if (readOnly) {
    return (
      <Box
        header={[
          <input
            key="filename"
            type="text"
            class="filename"
            readonly
            value={name}
            aria-label="Asset filename"
          />,
          additionalHeader,
        ]}
        {...props}
      >
        <Editor
          filename={name}
          content={content}
          diagnostics={diagnostics}
          readOnly
        />
      </Box>
    );
  } else {
    return (
      <Box
        header={[
          <input
            key="filename"
            type="text"
            class="filename"
            spellcheck="false"
            onInput={changeName}
            value={name}
            aria-label="Asset filename"
          />,
          additionalHeader,
          <input
            key="setEntry"
            type="checkbox"
            class="setEntry"
            title="Entrypoint"
            checked={isEntry}
            onChange={changeEntry}
          />,
          <button key="remove" class="remove" onClick={clickRemove}>
            -
          </button>,
        ]}
        {...props}
      >
        <Editor
          filename={name}
          content={content}
          onChange={changeContent}
          diagnostics={diagnostics}
        />
      </Box>
    );
  }
});

export default Asset;
