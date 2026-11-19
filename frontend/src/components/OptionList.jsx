import PropTypes from "prop-types";

// Genera las <option> de un <select> a partir de una lista de objetos.
export default function OptionList({ items = [], valueKey, labelKey, getLabel }) {
  return (
    <>
      {items.map((item) => (
        <option key={item[valueKey]} value={item[valueKey]}>
          {getLabel ? getLabel(item) : item[labelKey]}
        </option>
      ))}
    </>
  );
}

OptionList.propTypes = {
  items: PropTypes.array,
  valueKey: PropTypes.string.isRequired,
  labelKey: PropTypes.string,
  getLabel: PropTypes.func,
};
