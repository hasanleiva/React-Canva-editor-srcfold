import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from 'canva-editor/hooks';
import { PageSize, SerializedPage, SearchResponse, ImageData } from 'canva-editor/types';
import CloseSidebarButton from './CloseButton';
import TemplateSearchBox from './components/TemplateSearchBox';
import HorizontalCarousel from 'canva-editor/components/carousel/HorizontalCarousel';
import OutlineButton from 'canva-editor/components/button/OutlineButton';
import { unpack } from 'canva-editor/utils/minifier';
import useMobileDetect from 'canva-editor/hooks/useMobileDetect';
import axios from 'axios';
import { useTranslate } from 'canva-editor/contexts/TranslationContext';

interface Template {
  key: string;
  name: string;
  lastModified: string;
}
const TemplateContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { actions, activePage, config } = useEditor((state, config) => ({
    config,
    activePage: state.activePage,
  }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const dataRef = useRef(false);
  const [keyword, setKeyword] = useState('');
  const isMobile = useMobileDetect();
  const t = useTranslate();
  const loadData = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const res = await axios.get<{ templates: Template[] }>('/api/templates');
        setTemplates(res.data.templates);
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    },
    [setIsLoading]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async (kw: string) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setOffset(0);
    setKeyword(kw);
    setTemplates([]);
  };

  const addPages = async (key: string) => {
    try {
      const res = await axios.get(`/api/templates/${key}`);
      const data = res.data;
      if (Array.isArray(data)) {
        data.forEach((page, idx) => {
          const serializedData: SerializedPage = unpack(page);
          actions.changePageSize(serializedData.layers.ROOT.props.boxSize as PageSize);
          actions.setPage(activePage + idx, serializedData);
        });
      } else {
        const serializedData: SerializedPage = unpack(data);
        actions.changePageSize(serializedData.layers.ROOT.props.boxSize as PageSize);
        actions.setPage(activePage, serializedData);
      }
    } catch (err) {
      console.warn('Something went wrong!');
      console.log(err);
    }
    if (isMobile) {
      onClose();
    }
  };
  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        overflowY: 'auto',
        display: 'flex',
        padding: 16,
      }}
    >
      {!isMobile && <CloseSidebarButton onClose={onClose} />}
      <div>
        <TemplateSearchBox
          searchString={keyword}
          onStartSearch={handleSearch}
        />
        <div css={{ paddingTop: 8, marginBottom: 8 }}>
          <HorizontalCarousel>
            {config.templateKeywordSuggestions &&
              config.templateKeywordSuggestions.split(',').map((kw) => (
                <div key={kw} className='carousel-item'>
                  <OutlineButton
                    onClick={() => {
                      setKeyword(kw);
                      handleSearch(kw);
                    }}
                  >
                    {kw}
                  </OutlineButton>
                </div>
              ))}
          </HorizontalCarousel>
        </div>
      </div>
      <div
        css={{ flexDirection: 'column', overflowY: 'auto', display: 'flex' }}
      >
        <div
          ref={scrollRef}
          css={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gridGap: 8,
          }}
        >
          {templates.map((item, index) => (
            <div
              key={index}
              css={{ 
                cursor: 'pointer', 
                position: 'relative',
                background: '#f3f4f6',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
                textAlign: 'center',
                fontWeight: 500,
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#3b82f6',
                  background: '#eff6ff'
                }
              }}
              onClick={() => addPages(item.key)}
            >
              {item.name}
            </div>
          ))}
          {isLoading && <div>{t('common.loading', 'Loading...')}</div>}
        </div>
      </div>
    </div>
  );
};

export default TemplateContent;
