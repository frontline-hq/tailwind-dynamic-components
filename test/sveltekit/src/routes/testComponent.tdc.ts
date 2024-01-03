import { Styles } from '../../../../src';

export default new Styles('test01', {
	variants: ['sm', 'md'],
	dependencies: { color: ['blue', 'green'] }
}).staticStyles('bg-green-500');
