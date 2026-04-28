import React, { FC, useEffect, useState } from 'react';
import { useEditor } from 'canva-editor/hooks';
import CloseSidebarButton from './CloseButton';
import axios from 'axios';
import ArrowDownIcon from '../../icons/ArrowDownIcon';
import ArrowUpIcon from '../../icons/ArrowUpIcon';
import ImageIcon from '../../icons/ImageIcon';
import useMobileDetect from 'canva-editor/hooks/useMobileDetect';
import { useAuth } from 'canva-editor/contexts/AuthContext';

const extractTextFromHtml = (html: string) => {
  if (!html) return '';
  // Remove source code newlines to prevent them from becoming text content
  const cleanHtml = html.replace(/[\r\n]+/g, '');
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html');
  
  let text = '';
  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        text += '\n';
      } else {
        node.childNodes.forEach(traverse);
        if (el.tagName === 'P' || el.tagName === 'DIV') {
          text += '\n';
        }
      }
    }
  };
  
  doc.body.childNodes.forEach(traverse);
  return text.replace(/\n$/, '');
};

const updateTextInHtml = (html: string, newText: string) => {
  if (!html) return newText;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  const firstSpan = doc.body.querySelector('span');
  if (!firstSpan) {
    doc.body.innerHTML = '';
    const lines = newText.split('\n');
    lines.forEach((line, index) => {
      doc.body.appendChild(doc.createTextNode(line));
      if (index < lines.length - 1) {
        doc.body.appendChild(doc.createElement('br'));
      }
    });
    return doc.body.innerHTML;
  }

  let blockParent = firstSpan.parentElement;
  while (blockParent && blockParent !== doc.body && blockParent.tagName !== 'P' && blockParent.tagName !== 'DIV') {
    blockParent = blockParent.parentElement;
  }
  
  if (!blockParent || blockParent === doc.body) {
    doc.body.innerHTML = '';
    const lines = newText.split('\n');
    lines.forEach((line, index) => {
      const newSpan = firstSpan.cloneNode(false) as HTMLElement;
      newSpan.textContent = line;
      doc.body.appendChild(newSpan);
      if (index < lines.length - 1) {
        doc.body.appendChild(doc.createElement('br'));
      }
    });
    return doc.body.innerHTML;
  }

  const container = blockParent.parentElement || doc.body;
  container.innerHTML = '';
  
  const lines = newText.split('\n');
  lines.forEach(line => {
    const newBlock = blockParent!.cloneNode(true) as HTMLElement;
    const spanInNewBlock = newBlock.querySelector('span');
    if (spanInNewBlock) {
      spanInNewBlock.textContent = line;
      const allSpans = Array.from(newBlock.querySelectorAll('span'));
      allSpans.forEach(s => {
        if (s !== spanInNewBlock) s.remove();
      });
      const allBrs = Array.from(newBlock.querySelectorAll('br'));
      allBrs.forEach(br => br.remove());
    }
    container.appendChild(newBlock);
  });
  
  return doc.body.innerHTML;
};

interface DropdownItem {
  id: string;
  logo: string;
  text: string;
}

const CollapsibleSection: FC<{
  title: string;
  dotColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, dotColor, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div css={{ marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '12px 8px',
          userSelect: 'none',
          borderRadius: 6,
          '&:hover': {
            backgroundColor: '#f9fafb',
          }
        }}
      >
        <div css={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            css={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: dotColor,
            }}
          />
          <span css={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>
            {title.toUpperCase()}
          </span>
        </div>
        <div css={{ color: '#6b7280' }}>
          {isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </div>
      </div>
      {isOpen && (
        <div css={{ marginTop: 8, padding: '0 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
};

const TextInputItem: FC<{
  label: string;
  value: string;
  fontName?: string;
  onChange: (val: string) => void;
}> = ({ label, value, fontName, onChange }) => {
  // Rows grow as the user presses Enter — always a textarea so focus/cursor
  // never gets lost on type switching, and Enter naturally moves the cursor down.
  const rows = Math.max(1, (value ?? '').split('\n').length);

  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label css={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        css={{
          padding: '10px 12px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          color: '#111827',
          fontSize: 14,
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          transition: 'border-color 0.2s',
          '&:focus': {
            borderColor: '#3b82f6',
            backgroundColor: '#ffffff',
          }
        }}
      />
      {fontName && (
        <div css={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          marginTop: 4,
          alignSelf: 'flex-start',
        }}>
          <div css={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#9ca3af' }} />
          <span css={{ fontSize: 11, color: '#4b5563' }}>{fontName.replace(/['"]/g, '')}</span>
        </div>
      )}
    </div>
  );
};

const ImageUploadItem: FC<{
  label?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, onChange }) => {
  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label css={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </label>
      )}
      <label
        css={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          backgroundColor: '#f9fafb',
          border: '2px dashed #d1d5db',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
          '&:hover': {
            borderColor: '#3b82f6',
            backgroundColor: '#eff6ff',
          }
        }}
      >
        <div css={{ width: 24, height: 24, color: '#9ca3af', marginBottom: 8 }}>
          <ImageIcon />
        </div>
        <span css={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>
          Click to upload
        </span>
        <span css={{ fontSize: 11, color: '#6b7280' }}>
          PNG · JPG · WEBP
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          css={{ display: 'none' }}
        />
      </label>
    </div>
  );
};

const DropdownItemComponent: FC<{
  label: string;
  value: string;
  options: { id: string; text: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => {
  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label css={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <div css={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          css={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            color: '#111827',
            fontSize: 14,
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            '&:focus': {
              borderColor: '#3b82f6',
              backgroundColor: '#ffffff',
            }
          }}
        >
          <option value="" disabled>Select an option</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.text}</option>
          ))}
        </select>
        <div css={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #6b7280',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
};

type UnifiedItem =
  | { kind: 'text'; layer: ReturnType<typeof Object.values>[0] }
  | { kind: 'dropdown'; groupKey: string; layers: ReturnType<typeof Object.values>[0][] }
  | { kind: 'divider'; layerId: string };

const ElementsContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { layers, actions, activePage, pageSize } = useEditor((state) => ({
    layers: state.pages[state.activePage] && state.pages[state.activePage].layers,
    activePage: state.activePage,
    pageSize: state.pageSize,
  }));
  const { user } = useAuth();
  const isUserRole = user?.role === 'user';
  const isMobile = useMobileDetect();

  const [dropdownDataCache, setDropdownDataCache] = useState<Record<string, DropdownItem[]>>({});

  useEffect(() => {
    if (!layers) return;

    const fetchDropdownData = async () => {
      const dropdownFiles = new Set<string>();
      Object.values(layers).forEach(layer => {
        const elementType = layer.data.props.elementType || (layer.data.props as any).aq;
        const dropdownData = layer.data.props.dropdownData || (layer.data.props as any).ar;
        if (elementType === 'dropdown' && dropdownData) {
          dropdownFiles.add(dropdownData);
        }
      });

      for (const file of dropdownFiles) {
        if (!dropdownDataCache[file]) {
          try {
            const url = file.startsWith('http') ? file : `/dropdown-data/${file}`;
            const response = await axios.get(url);
            setDropdownDataCache(prev => ({ ...prev, [file]: response.data }));
          } catch (error) {
            console.error(`Failed to fetch dropdown data from ${file}:`, error);
          }
        }
      }
    };

    fetchDropdownData();
  }, [layers]);

  if (!layers) return null;

  const editableLayers = Object.values(layers).filter((layer) => {
    const elementType = layer.data.props.elementType || (layer.data.props as any).aq;
    return elementType && elementType !== '';
  });

  // Group layers
  const imageLayers = editableLayers.filter(l => {
    const elementType = l.data.props.elementType || (l.data.props as any).aq;
    return elementType === 'image';
  });

  const textLayers = editableLayers.filter(l => {
    const elementType = l.data.props.elementType || (l.data.props as any).aq;
    return elementType === 'input text';
  });

  const dropdownGroups: Record<string, typeof editableLayers> = {};
  editableLayers.forEach(layer => {
    const elementType = layer.data.props.elementType || (layer.data.props as any).aq;
    const dropdownData = layer.data.props.dropdownData || (layer.data.props as any).ar;
    if (elementType === 'dropdown' && dropdownData) {
      const file = dropdownData;
      const name = layer.data.props.name || (layer.data.props as any).a || 'Dropdown';
      // Group by both file and name so that same-named layers share a dropdown,
      // but differently named layers get their own dropdown even if they use the same file.
      const groupKey = `${file}::${name}`;
      if (!dropdownGroups[groupKey]) dropdownGroups[groupKey] = [];
      dropdownGroups[groupKey].push(layer);
    }
  });

  const handleTextChange = (layerId: string, currentHtml: string, newText: string) => {
    actions.history.new();
    const updatedHtml = updateTextInHtml(currentHtml, newText);
    const layer = editableLayers.find(l => l.id === layerId);
    if (layer) {
      const isMinified = (layer.data.props as any).v !== undefined && layer.data.props.text === undefined;
      const propName = isMinified ? 'v' : 'text';
      actions.setProp(activePage, layerId, { [propName]: updatedHtml });
    }
  };

  const handleEditSize = () => {
    const rootLayer = layers?.['ROOT'];
    if (!rootLayer) return;
    const image = rootLayer.data.props.image || (rootLayer.data.props as any).p;
    if (!image?.url) return;
    const { boxSize, position, rotate } = rootLayer.data.props;
    actions.selectLayers(activePage, 'ROOT');
    actions.openImageEditor(activePage, 'ROOT', {
      boxSize,
      position: position || { x: 0, y: 0 },
      rotate: rotate || 0,
      image: {
        boxSize: image.boxSize || boxSize,
        position: image.position || { x: 0, y: 0 },
        rotate: image.rotate || 0,
        url: image.url,
      },
    });
  };

  const handleImageChange = (layerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        actions.history.new();
        
        if (layerId === 'ROOT') {
          const layer = layers['ROOT'];
          if (layer) {
            // Apply the same "cover" logic as "Set image as background":
            // scale the image to fill the canvas while preserving aspect ratio,
            // centering it so no empty edges appear.
            const img = new window.Image();
            img.onload = () => {
              const imageRatio = img.naturalWidth / img.naturalHeight;
              const canvasRatio = pageSize.width / pageSize.height;
              let bgBoxSize: { width: number; height: number };
              let bgPosition: { x: number; y: number };
              if (canvasRatio > imageRatio) {
                bgBoxSize = { width: pageSize.width, height: pageSize.width / imageRatio };
                bgPosition = { x: 0, y: (bgBoxSize.height - pageSize.height) / -2 };
              } else {
                bgBoxSize = { width: pageSize.height * imageRatio, height: pageSize.height };
                bgPosition = { x: (bgBoxSize.width - pageSize.width) / -2, y: 0 };
              }
              const isMinified = (layer.data.props as any).p !== undefined && layer.data.props.image === undefined;
              const propName = isMinified ? 'p' : 'image';
              actions.setProp(activePage, layerId, {
                [propName]: {
                  url,
                  thumb: url,
                  boxSize: bgBoxSize,
                  position: bgPosition,
                  rotate: 0,
                },
              });
            };
            img.src = url;
          }
          return;
        }

        const layer = editableLayers.find(l => l.id === layerId);
        if (layer) {
          const isMinified = (layer.data.props as any).p !== undefined && layer.data.props.image === undefined;
          const propName = isMinified ? 'p' : 'image';
          const currentImage = (layer.data.props as any)[propName] || {};
          actions.setProp(activePage, layerId, {
            [propName]: {
              ...currentImage,
              url,
              thumb: url,
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDropdownChange = (groupKey: string, selectedId: string) => {
    const [file] = groupKey.split('::');
    const data = dropdownDataCache[file];
    if (!data) return;

    const selectedItem = data.find(item => item.id === selectedId);
    if (!selectedItem) return;

    actions.history.new();
    
    // Update all layers associated with this dropdown group
    dropdownGroups[groupKey].forEach(layer => {
      if (layer.data.type === 'Text') {
        const text = layer.data.props.text || (layer.data.props as any).v;
        const updatedHtml = updateTextInHtml(text || '', selectedItem.text);
        const isMinified = (layer.data.props as any).v !== undefined && layer.data.props.text === undefined;
        const propName = isMinified ? 'v' : 'text';
        actions.setProp(activePage, layer.id, { [propName]: updatedHtml });
      } else if (layer.data.type === 'Image') {
        const isMinified = (layer.data.props as any).p !== undefined && layer.data.props.image === undefined;
        const propName = isMinified ? 'p' : 'image';
        const currentImage = (layer.data.props as any)[propName] || {};
        actions.setProp(activePage, layer.id, {
          [propName]: {
            ...currentImage,
            url: selectedItem.logo,
            thumb: selectedItem.logo,
          },
        });
      }
    });
  };

  const getOrderedLayerIds = (layerId: string): string[] => {
    const layer = layers[layerId];
    if (!layer) return [];
    let ids = [layerId];
    if (layer.data.child && Array.isArray(layer.data.child)) {
      const children = [...layer.data.child].reverse();
      for (const childId of children) {
        ids = ids.concat(getOrderedLayerIds(childId));
      }
    }
    return ids;
  };

  const orderedIds = layers['ROOT'] ? getOrderedLayerIds('ROOT') : [];

  // Build a single unified ordered list of text + dropdown items, in canvas order
  const unifiedItems: UnifiedItem[] = [];
  const seenDropdownKeys = new Set<string>();

  for (const id of orderedIds) {
    const layer = layers[id];
    if (!layer) continue;
    const elementType = layer.data.props.elementType || (layer.data.props as any).aq;
    if (!elementType) continue;

    if (elementType === 'input text') {
      unifiedItems.push({ kind: 'text', layer });
    } else if (elementType === 'dropdown') {
      const dropdownData = layer.data.props.dropdownData || (layer.data.props as any).ar;
      const name = layer.data.props.name || (layer.data.props as any).a || 'Dropdown';
      const groupKey = `${dropdownData}::${name}`;
      if (!seenDropdownKeys.has(groupKey)) {
        seenDropdownKeys.add(groupKey);
        unifiedItems.push({ kind: 'dropdown', groupKey, layers: dropdownGroups[groupKey] || [] });
      }
    } else if (elementType === 'divider') {
      unifiedItems.push({ kind: 'divider', layerId: id });
    }
  }

  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        display: 'flex',
        padding: '16px 20px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#333333',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div css={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h3 css={{ fontWeight: 600, fontSize: 16, margin: 0, flexGrow: 1 }}>Elements</h3>
        {!isMobile && <CloseSidebarButton onClose={onClose} />}
      </div>

      <div css={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', overflowX: 'hidden', flexGrow: 1 }}>
        <CollapsibleSection title="Background Image" dotColor="#10b981" defaultOpen={false}>
          <ImageUploadItem
            key="ROOT"
            label="Background Image"
            onChange={(e) => handleImageChange('ROOT', e)}
          />
          {isUserRole && (() => {
            const rootLayer = layers?.['ROOT'];
            const hasImage = !!(rootLayer?.data.props.image?.url || (rootLayer?.data.props as any)?.p?.url);
            return (
              <button
                onClick={handleEditSize}
                disabled={!hasImage}
                css={{
                  width: '100%',
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: hasImage ? '#2563eb' : '#e5e7eb',
                  color: hasImage ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: hasImage ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                  '&:hover': hasImage ? { backgroundColor: '#1d4ed8' } : {},
                }}
              >
                Edit Size
              </button>
            );
          })()}
        </CollapsibleSection>

        {imageLayers.length > 0 && (
          <CollapsibleSection title="IMAGES" dotColor="#10b981">
            {imageLayers.map((layer) => {
              const name = layer.data.props.name || (layer.data.props as any).a;
              return (
                <ImageUploadItem
                  key={layer.id}
                  label={name || 'Image'}
                  onChange={(e) => handleImageChange(layer.id, e)}
                />
              );
            })}
          </CollapsibleSection>
        )}

        {unifiedItems.length > 0 && (
          <CollapsibleSection title="ELEMENTS" dotColor="#3b82f6">
            {unifiedItems.map((item) => {
              if (item.kind === 'divider') {
                return (
                  <div
                    key={`divider-${item.layerId}`}
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px 0',
                      margin: '4px 0',
                    }}
                  >
                    <div css={{ flex: 1, height: 1, backgroundColor: '#d1d5db' }} />
                  </div>
                );
              } else if (item.kind === 'text') {
                const { layer } = item;
                const name = layer.data.props.name || (layer.data.props as any).a;
                const text = layer.data.props.text || (layer.data.props as any).v;
                const plainText = extractTextFromHtml(text || '');
                return (
                  <TextInputItem
                    key={layer.id}
                    label={name || 'Text Element'}
                    value={plainText}
                    onChange={(val) => handleTextChange(layer.id, text || '', val)}
                  />
                );
              } else {
                const { groupKey, layers: layersInGroup } = item;
                const [file] = groupKey.split('::');
                const data = dropdownDataCache[file] || [];
                let currentValue = '';
                const firstTextLayer = layersInGroup.find(l => l.data.type === 'Text');
                if (firstTextLayer) {
                  const text = firstTextLayer.data.props.text || (firstTextLayer.data.props as any).v;
                  const currentText = extractTextFromHtml(text || '');
                  const matchedItem = data.find(d => d.text === currentText);
                  if (matchedItem) currentValue = matchedItem.id;
                } else {
                  const firstImageLayer = layersInGroup.find(l => l.data.type === 'Image');
                  if (firstImageLayer) {
                    const image = firstImageLayer.data.props.image || (firstImageLayer.data.props as any).p;
                    const matchedItem = data.find(d => d.logo === image?.url);
                    if (matchedItem) currentValue = matchedItem.id;
                  }
                }
                const firstLayerName = layersInGroup[0]?.data.props.name || (layersInGroup[0]?.data.props as any).a || 'Dropdown';
                return (
                  <DropdownItemComponent
                    key={`dropdown-${groupKey}`}
                    label={firstLayerName}
                    value={currentValue}
                    options={data}
                    onChange={(val) => handleDropdownChange(groupKey, val)}
                  />
                );
              }
            })}
          </CollapsibleSection>
        )}

        {editableLayers.length === 0 && (
          <p css={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 20 }}>
            No editable elements found in this template.
          </p>
        )}
      </div>
    </div>
  );
};

export default ElementsContent;

