import { isUndefined } from 'lodash'

export const getInt = (value?: string, defultValue?: number): number => {
	if (isUndefined(value) || value.length === 0) {
		if (!isUndefined(defultValue)) {
			return defultValue
		} else {
			throw new Error('No config value provided')
		}
	}
	if (!/^\d+$/.test(value)) {
		throw new Error('Invalid config value provided')
	}
	return parseInt(value, 10)
}
