import React, { FC, useState } from 'react';
import { SortableContainer, SortableElement } from 'canva-editor/drag-and-drop';
import { Layer, LayerComponentProps } from 'canva-editor/types';
import { isGroupLayer } from 'canva-editor/utils/layer/layers';
import MoreVertIcon from 'canva-editor/icons/MoreVertIcon';
import MoreHorizIcon from 'canva-editor/icons/MoreHorizIcon';
import GroupingIcon from 'canva-editor/icons/GroupingIcon';
import styled from 'styled-components';
import ReverseTransformLayer from './ReverseTransformLayer';
import { SortEnd } from 'canva-editor/drag-and-drop/types';
import { useAuth } from 'canva-editor/contexts/AuthContext';
import { useEditor } from 'canva-editor/hooks';

type LayerSortableType = {
  items?: Array<Layer<LayerComponentProps>> | any;
  checkIsSelected: (layerId: string) => boolean;
  onSelectLayer: (layerId: string) => void;
  onOpenContextMenu: (e: React.MouseEvent) => void;
  onChange: (change: {
    layerId: string;
    fromIndex: number;
    toIndex: number;
  }) => void;
};

const LayerItem = styled('button')`
  width: 100%;
  background: #f6f6f6;
  border-radius: 8px;
  padding: 8px;
  margin: 4px 0;
  cursor: pointer;
  border-width: 2px;
  border-style: solid;
  position: relative;
  display: flex;
  flex-direction: column;

  .drag-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
  }

  .more-btn {
    display: none;
    position: absolute;
    right: 4px;
    top: 4px;
    background: #5e6278;
    border-radius: 8px;
    color: #fff;
    padding: 0 6px;
    @media (max-width: 900px) {
      display: none!important;
    }
  }
  :hover .more-btn {
    display: block;
  }
`;

const SortableItem = SortableElement(
  React.forwardRef<HTMLLIElement, {
    item?: Layer<LayerComponentProps> | any;
    index?: number;
    isSelected?: number;
    onSelectLayer: () => void;
    onOpenContextMenu: (e: React.MouseEvent) => void;
  }>(({
    item,
    isSelected,
    onSelectLayer,
    onOpenContextMenu,
  }, ref) => {
    const { user } = useAuth();
    const { actions, activePage } = useEditor((state) => ({ activePage: state.activePage }));

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.history.new();
      actions.setProp(activePage, item.id, { name: e.target.value });
    };

    const handleElementTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      actions.history.new();
      actions.setProp(activePage, item.id, { elementType: e.target.value as any });
    };

    return (
      <li ref={ref} css={{ listStyle: 'none' }}>
        <LayerItem
          key={item.id}
          type="button"
          css={{
            borderColor: isSelected ? '#3d8eff' : 'transparent',
          }}
          onContextMenu={onOpenContextMenu}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            
            // Don't interfere if clicking on drag icon or inputs
            if (target.closest('.drag-icon') || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
              return;
            }
            
            // Track mouse position and time for click vs drag detection
            const startX = e.clientX;
            const startY = e.clientY;
            const startTime = Date.now();
            let hasMoved = false;
            let clickHandled = false;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const moved = Math.abs(moveEvent.clientX - startX) > 5 || 
                           Math.abs(moveEvent.clientY - startY) > 5;
              if (moved) {
                hasMoved = true;
                // If moved, it's a drag - let the drag library handle it
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              }
            };
            
            const handleMouseUp = (upEvent: MouseEvent) => {
              const timeElapsed = Date.now() - startTime;
              const moved = Math.abs(upEvent.clientX - startX) > 5 || 
                           Math.abs(upEvent.clientY - startY) > 5;
              
              // If it was a quick click without movement, select
              if (!hasMoved && !moved && timeElapsed < 300 && !clickHandled) {
                clickHandled = true;
                onSelectLayer();
              }
              
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            // Listen for mouse movement and release
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <div className='drag-icon'>
              <MoreVertIcon />
            </div>
            {(item.data.props.elementType || (item.data.props as any).aq) === 'divider' ? (
              <div css={{ minWidth: 0, flexGrow: 1, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8 }}>
                <div css={{ flex: 1, height: 2, borderRadius: 1, background: 'repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 6px, transparent 6px, transparent 12px)' }} />
                <span css={{ fontSize: 11, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>DIVIDER</span>
              </div>
            ) : (
              <>
                <div css={{ minWidth: 0, flexGrow: 1 }}>
                  <ReverseTransformLayer layer={item} />
                </div>
                {isGroupLayer(item) && (
                  <div css={{ flexShrink: 0, fontSize: 24 }}>
                    <GroupingIcon />
                  </div>
                )}
              </>
            )}
          </div>
          {user?.role === 'admin' && (() => {
            const name = item.data.props.name || (item.data.props as any).a || '';
            const elementType = item.data.props.elementType || (item.data.props as any).aq || '';
            const dropdownData = item.data.props.dropdownData || (item.data.props as any).ar || '';
            return (
            <div css={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, padding: '0 8px', width: '100%' }} onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Layer Name"
                value={name}
                onChange={handleNameChange}
                css={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 12,
                  width: '100%'
                }}
              />
              <select
                value={elementType}
                onChange={handleElementTypeChange}
                css={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  fontSize: 12,
                  width: '100%'
                }}
              >
                <option value="">Select Element Type</option>
                <option value="input text">Input Text</option>
                <option value="image">Image</option>
                <option value="dropdown">Dropdown</option>
                <option value="divider">Divider</option>
              </select>
              {elementType === 'dropdown' && (
                <input
                  type="text"
                  placeholder="Dropdown JSON filename (e.g., data.json)"
                  value={dropdownData}
                  onChange={(e) => {
                    actions.history.new();
                    actions.setProp(activePage, item.id, { dropdownData: e.target.value });
                  }}
                  css={{
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 12,
                    width: '100%'
                  }}
                />
              )}
            </div>
          )})()}
          <div className='more-btn' onMouseDown={onOpenContextMenu}>
            <MoreHorizIcon style={{ width: 16, height: 16 }} />
          </div>
        </LayerItem>
      </li>
    );
  })
);

const SortableList = SortableContainer(
  React.forwardRef<HTMLUListElement, LayerSortableType>(
    ({
      items,
      checkIsSelected,
      onOpenContextMenu,
      onSelectLayer,
    }, ref) => {
      if (!items || !Array.isArray(items)) {
        return <ul ref={ref}></ul>;
      }
      
      return (
        <ul ref={ref}>
          {items.map((layer: Layer<LayerComponentProps>, index: number) => (
            <SortableItem
              key={`item-${index}`}
              item={layer}
              isSelected={checkIsSelected(layer.id)}
              onSelectLayer={() => onSelectLayer(layer.id)}
              onOpenContextMenu={onOpenContextMenu}
              index={index}
            />
          ))}
        </ul>
      );
    }
  )
);

const SortableListLayer: FC<LayerSortableType> = ({
  items,
  checkIsSelected,
  onSelectLayer,
  onOpenContextMenu,
  onChange,
}) => {
  return (
    <SortableList
      items={items}
      checkIsSelected={checkIsSelected}
      onSelectLayer={onSelectLayer}
      onOpenContextMenu={onOpenContextMenu}
      onSortEnd={(change: SortEnd) => {
        if (change?.newIndex !== change.oldIndex) {
          onChange({
            layerId: items[change.oldIndex].id,
            fromIndex: change.oldIndex,
            toIndex: change.newIndex,
          });
        }
      }}
    />
  );
};

export default SortableListLayer;
