import QRCode from 'react-qr-code';

interface Props {
  value: string;
  size?: number;
}

export const QrLabel = ({ value, size = 96 }: Props) => (
  <div style={{ background: 'white', padding: 4 }}>
    <QRCode value={value || ' '} size={size} />
  </div>
);
