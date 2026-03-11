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
  img: ImageData;
  data: Array<SerializedPage> | SerializedPage;
  pages: number;
}
const TemplateContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [r2Templates, setR2Templates] = useState<string[]>([]);
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

  const loadR2Templates = async () => {
    try {
      const res = await axios.get('/api/templates/list');
      if (res.data.success) {
        setR2Templates(res.data.templates);
      }
    } catch (err) {
      console.error('Failed to load R2 templates', err);
    }
  };

  const loadData = useCallback(
    async (offset = 0, kw = '') => {
      dataRef.current = true;
      setIsLoading(true);
      try {
        const res = await axios.get<SearchResponse<Template>>(
          `${config.apis.url}${config.apis.searchTemplates}?ps=18&pi=${offset}&kw=${kw}`
        );

        if (res.data.data) {
          setTemplates((templates) => [...templates, ...res.data.data]);
        }
        if (res.data.data.length > 0) {
          dataRef.current = false;
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    },
    [setIsLoading]
  );

  useEffect(() => {
    loadData(offset, keyword);
    if (offset === 0) {
      loadR2Templates();
    }
  }, [offset, keyword]);

  useEffect(() => {
    const handleLoadMore = async (e: Event) => {
      const node = e.target as HTMLDivElement;
      if (
        node.scrollHeight - node.scrollTop - 80 <= node.clientHeight &&
        !dataRef.current
      ) {
        setOffset((prevOffset) => prevOffset + 1);
      }
    };

    scrollRef.current?.addEventListener('scroll', handleLoadMore);
    return () => {
      scrollRef.current?.removeEventListener('scroll', handleLoadMore);
    };
  }, [loadData]);

  const handleSearch = async (kw: string) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setOffset(0);
    setKeyword(kw);
    setTemplates([]);
  };

  const addPages = async (data: Array<SerializedPage> | SerializedPage) => {
    try {
      const unpackedData = unpack(data);
      const pages = Array.isArray(unpackedData) ? unpackedData : [unpackedData];
      actions.setData(pages);
    } catch (err) {
      console.warn('Something went wrong!');
      console.log(err);
    }
    if (isMobile) {
      onClose();
    }
  };

  const loadR2Template = async (id: string) => {
    try {
      const res = await axios.get(`/api/templates/get/${id}`);
      if (res.data.success) {
        addPages(res.data.content);
      }
    } catch (err) {
      console.error('Failed to load template', err);
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
          {r2Templates.map((id) => (
            <div
              key={id}
              css={{
                cursor: 'pointer',
                padding: '16px',
                background: '#f0f0f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                wordBreak: 'break-all',
                minHeight: '100px',
              }}
              onClick={() => loadR2Template(id)}
            >
              {id}
            </div>
          ))}
          {templates.map((item, index) => (
            <div
              key={index}
              css={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => addPages(item.data)}
            >
              {!!item?.img && <img src={item?.img?.url} width={item?.img?.width} height={item?.img?.height} loading='lazy' />}
              {item.pages > 1 && (
                <span
                  css={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    backgroundColor: 'rgba(17,23,29,.6)',
                    padding: '1px 6px',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 10,
                  }}
                >
                  {item.pages}
                </span>
              )}
            </div>
          ))}
          {isLoading && <div>{t('common.loading', 'Loading...')}</div>}
        </div>
      </div>
    </div>
  );
};

export default TemplateContent;
