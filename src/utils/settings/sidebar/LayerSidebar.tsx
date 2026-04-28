import React, {
  forwardRef,
  ForwardRefRenderFunction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from 'axios';
import reverse from 'lodash/reverse';
import Sidebar, { SidebarProps } from './Sidebar';
import ReverseTransformLayer from './layer/ReverseTransformLayer';
import { useEditor, useSelectedLayers } from 'canva-editor/hooks';
import { getPosition } from 'canva-editor/utils';
import { PageContext } from 'canva-editor/layers/core/PageContext';
import BackgroundSelectionIcon from 'canva-editor/icons/BackgroundSelectionIcon';
import { cloneDeep } from 'lodash';
import SortableListLayer from './layer/SortableListLayer';
import CloseIcon from 'canva-editor/icons/CloseIcon';
import useMobileDetect from 'canva-editor/hooks/useMobileDetect';
import BottomSheet from 'canva-editor/components/bottom-sheet/BottomSheet';

type LayerSidebarProps = SidebarProps;
const LayerSidebar: ForwardRefRenderFunction<
  HTMLDivElement,
  LayerSidebarProps
> = ({ ...props }, ref) => {
  const dataRef = useRef({ isMultipleSelect: false });
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    axios.get('/api/auth/user').then(res => {
      setUser(res.data.user);
    }).catch(() => {});
  }, []);
  const { selectedLayerIds } = useSelectedLayers();
  const isMobile = useMobileDetect();
  const { layers, actions, activePage } = useEditor((state) => ({
    layers:
      state.pages[state.activePage] && state.pages[state.activePage].layers,
    activePage: state.activePage,
  }));
  const layerList = useMemo(() => {
    if (!layers) {
      return;
    }
    return reverse(layers['ROOT'].data.child.map((layerId) => layers[layerId]));
  }, [layers]);
  const rootLayer = useMemo(() => {
    if (!layers) {
      return;
    }
    return layers.ROOT;
  }, [layers]);
  useEffect(() => {
    const enableMultipleSelect = (e: KeyboardEvent) => {
      dataRef.current.isMultipleSelect = e.shiftKey;
    };
    window.addEventListener('keydown', enableMultipleSelect);
    window.addEventListener('keyup', enableMultipleSelect);
    return () => {
      window.removeEventListener('keydown', enableMultipleSelect);
      window.removeEventListener('keyup', enableMultipleSelect);
    };
  }, []);

  const checkLayerSelected = (layerId: string) => {
    return selectedLayerIds.includes(layerId);
  };

  const onSelectLayer = (layerId: string) => {
    actions.selectLayers(
      activePage,
      layerId,
      dataRef.current.isMultipleSelect ? 'add' : 'replace'
    );
  };

  const handleClickOption = (e: React.MouseEvent) => {
    e.preventDefault();
    actions.showContextMenu(getPosition(e.nativeEvent));
  };

  const handleBringTo = (
    layerId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    if (!layerList) return;
    const indexBeforeReverse = layerList.length - 1 - toIndex;
    if (fromIndex > toIndex) {
      actions.bringToFront(activePage, layerId, indexBeforeReverse);
    } else {
      actions.sendToBack(activePage, layerId, indexBeforeReverse);
    }
  };

  const renderPage = () => (
    <PageContext.Provider value={{ pageIndex: activePage }}>
      <div
        css={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            height: 50,
            borderBottom: '1px solid rgba(57,76,96,.15)',
            padding: '0 20px',
          }}
        >
          <p
            css={{
              lineHeight: '48px',
              fontWeight: 600,
              color: '#181C32',
              flexGrow: 1,
            }}
          >
            Layers
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                actions.addLayer({
                  type: { resolvedName: 'FrameLayer' },
                  props: {
                    elementType: 'divider',
                    name: 'Divider',
                    boxSize: { width: 400, height: 4 },
                    color: 'transparent',
                    clipPath: '',
                    gradientBackground: null,
                    image: null,
                    rotate: 0,
                    scale: 1,
                  } as any,
                } as any);
              }}
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                marginRight: 8,
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: '#e5e7eb',
                },
              }}
            >
              <span css={{ fontSize: 14, lineHeight: 1 }}>—</span>
              <span>Add Divider</span>
            </button>
          )}
          <div
            css={{
              fontSize: 20,
              flexShrink: 0,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              actions.setSidebar();
            }}
          >
            <CloseIcon />
          </div>
        </div>

        <div
          ref={ref}
          css={{
            flexGrow: 1,
            overflowY: 'auto',
          }}
        >
          <div
            css={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr)',
              gridRowGap: 8,
              padding: 16,
            }}
          >
            <SortableListLayer
              items={cloneDeep(layerList)}
              checkIsSelected={checkLayerSelected}
              onSelectLayer={onSelectLayer}
              onOpenContextMenu={handleClickOption}
              onChange={(change) => {
                handleBringTo(change.layerId, change.fromIndex, change.toIndex);
              }}
              isAdmin={user?.role === 'admin'}
              onUpdateLayer={(layerId, props) => {
                actions.setProp(activePage, layerId, props);
              }}
            />
            {rootLayer && (
              <div
                css={{
                  background: '#F6F6F6',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  position: 'relative',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: selectedLayerIds.includes(rootLayer.id)
                    ? '#3d8eff'
                    : 'transparent',
                }}
                onMouseDown={() => {
                  actions.selectLayers(
                    activePage,
                    rootLayer.id,
                    dataRef.current.isMultipleSelect ? 'add' : 'replace'
                  );
                }}
              >
                <div
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div
                    css={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  ></div>
                  <div css={{ minWidth: 0, flexGrow: 1 }}>
                    <ReverseTransformLayer
                      layer={rootLayer}
                      hiddenChild={true}
                    />
                  </div>

                  <div css={{ flexShrink: 0, fontSize: 24 }}>
                    <BackgroundSelectionIcon />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContext.Provider>
  );

  return isMobile ? (
    <BottomSheet
      isOpen={props.open}
      containerId='bottom_sheet'
      dragListener={false}
      zIndex={12}
      style={{ paddingBottom: 0 }}
      onClose={() => {}}
    >
      {renderPage()}
    </BottomSheet>
  ) : (
    <Sidebar {...props}>{renderPage()}</Sidebar>
  );
};

export default forwardRef<HTMLDivElement, LayerSidebarProps>(LayerSidebar);
