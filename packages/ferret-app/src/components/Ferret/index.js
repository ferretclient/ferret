import React from 'react';
// Inlined as a data URI: the packaged app loads from file://, where bundled /static asset URLs don't resolve.
import logo from 'assets/logo.png?inline';

const Ferret = ({ width }) => {
  return <img src={logo} width={width} height={width} alt="Ferret" draggable={false} />;
};

export default Ferret;
