import { FontData } from 'canva-editor/types';
import { isTextLayer } from 'canva-editor/utils/layer/layers';
import { uniqBy } from 'lodash';
import { useEditor } from '.';

export const useUsedFont = () => {
    const { fontFamilyList } = useEditor((state) => {
        const fontFamilyList: FontData[] = [];
        state.pages.forEach((page) => {
            Object.entries(page.layers).forEach(([, layer]) => {
                if (isTextLayer(layer)) {
                    layer.data.props.fonts.forEach(font => {
                        // Fix old broken URLs that have %2F instead of /
                        const fixedUrl = font.url.replace(/%2F/g, '/');
                        fontFamilyList.push({ ...font, url: fixedUrl });
                    });
                }
            });
        });
        return {
            fontFamilyList: uniqBy(fontFamilyList, 'name'),
        };
    });

    return { usedFonts: fontFamilyList };
};
