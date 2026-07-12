export interface SafemapLayerConfig {
  endpoint: string;   // IF_0081_WMS 등
  layerName: string;
  styles: string;
}
export const SAFEMAP_LAYERS: Record<string, SafemapLayerConfig> = {
  all: {
    endpoint: 'IF_0087_WMS',
    layerName: 'A2SM_CRMNLHSPOT_TOT',
    styles: 'A2SM_CrmnlHspot_Tot_Tot',

  },
  child: {
    endpoint: 'IF_0081_WMS',
    layerName: 'A2SM_ODBLRCRMNLHSPOT_KID',
    styles: 'A2SM_OdblrCrmnlHspot_Kid',
  },
  elderly: {
    endpoint: 'IF_0082_WMS',
    layerName: 'A2SM_ODBLRCRMNLHSPOT_ODSN',
    styles: 'A2SM_OdblrCrmnlHspot_Odsn',
  },
  violence: {
    endpoint: 'IF_0083_WMS',
    layerName: 'A2SM_CRMNLHSPOT_TOT',
    styles: 'A2SM_CrmnlHspot_Tot_Violn',
  },
  theft: {
    endpoint: 'IF_0084_WMS',
    layerName: 'A2SM_CRMNLHSPOT_TOT',
    styles: 'A2SM_CrmnlHspot_Tot_Theft',
  },
  sex: {
    endpoint: 'IF_0085_WMS',
    layerName: 'A2SM_CRMNLHSPOT_TOT',
    styles: 'A2SM_CrmnlHspot_Tot_Rape',
  },
  robbery: {
    endpoint: 'IF_0086_WMS',
    layerName: 'A2SM_CRMNLHSPOT_TOT',
    styles: 'A2SM_CrmnlHspot_Tot_Brglr',
  },

};