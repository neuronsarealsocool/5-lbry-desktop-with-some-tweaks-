// @flow
import * as React from 'react';
import Button from 'component/button';
import Card from 'component/common/card';
import { IMGBB_API_KEY } from 'constants/settings';

export default function SettingImageHosting() {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem(IMGBB_API_KEY) || '');
  const [saved, setSaved] = React.useState(false);

  function handleSave() {
    localStorage.setItem(IMGBB_API_KEY, apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card
      title={__('Image Hosting')}
      subtitle={__('ImgBB API key — used by the image upload button in the post editor. Get your key at imgbb.com/faq (API section).')}
      actions={
        <div className="section__actions">
          <label htmlFor="imgbb-api-key" className="settings__label">
            {__('ImgBB API Key')}
          </label>
          <input
            id="imgbb-api-key"
            type="password"
            className="form-field__input"
            placeholder={__('Paste your ImgBB API key here')}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ maxWidth: '400px', marginBottom: '12px', display: 'block' }}
          />
          <Button
            button="primary"
            label={saved ? __('Saved!') : __('Save')}
            onClick={handleSave}
          />
        </div>
      }
    />
  );
}
