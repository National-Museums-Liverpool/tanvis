import { clearElement } from '../utils/dom.js';

// Update this constant to change the fixed text shown by the general-info-block visualisation.
const GENERAL_INFO_TEXT = `These visualisations use live publicly available 
    data obtained from BRC's iRecord and NBN Trust's NBN Atlas. 
    Collation and pre-processed of the data is achieved by TanHub 
    (designed by John Van Breda). TanVis tools use the data to generate 
    the visualisations (designed by Rich Burkmar). The coding for both 
    TanHub and TanVis are opensource and available from GitHub. `;

export function createGeneralInfoBlockAdapter() {
  return {
    name: 'general-info-block',
    render(element) {
      clearElement(element);

      const content = element.ownerDocument.createElement('div');
      content.dataset.tanvisGeneralInfoBlock = 'content';
      content.textContent = GENERAL_INFO_TEXT;
      element.appendChild(content);
    }
  };
}
